import React, { useState, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CHUNK_SIZE = 400 * 1024 * 1024; // 5MB

export default function ChunkedUploader() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const currentChunkRef = useRef(0);
  const totalChunksRef = useRef(0);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const uploadChunk = async (chunk, chunkIndex, totalChunks, retries = 3) => {
    const response = await fetch("http://localhost:3000/upload-chunk", {
      method: "POST",
      headers: {
        filename: file.name,
        chunkindex: chunkIndex,
        totalchunks: totalChunks,
      },
      body: chunk,
    });

    if (!response.ok) {
      if (retries > 0) {
        toast.warning(`Retrying chunk ${chunkIndex}...`);
        return uploadChunk(chunk, chunkIndex, totalChunks, retries - 1);
      } else {
        throw new Error(`Chunk ${chunkIndex} failed after 3 retries`);
      }
    }
  };

  const upload = async () => {
    if (!file) return toast.error("Please select a file");
    setUploading(true);
    setPaused(false);
    toast.info("Upload started");

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    totalChunksRef.current = totalChunks;
    const fileName = file.name;

    while (currentChunkRef.current < totalChunks) {
      if (paused) {
        toast.info("Upload paused");
        return;
      }

      const start = currentChunkRef.current * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunk = file.slice(start, end);

      try {
        await uploadChunk(chunk, currentChunkRef.current, totalChunks);
        currentChunkRef.current++;
        const percent = Math.floor(
          (currentChunkRef.current / totalChunks) * 100
        );
        setProgress(percent);
        toast.dismiss();
        toast.info(`Uploading... ${percent}%`);
      } catch (err) {
        setUploading(false);
        toast.error(err.message);
        return;
      }
    }

    await fetch("http://localhost:3000/merge-chunks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: fileName, totalChunks }),
    });

    toast.success("Upload complete!");
    setUploading(false);
    setProgress(100);
  };

  const pauseUpload = () => {
    setPaused(true);
  };

  const resumeUpload = () => {
    setPaused(false);
    upload();
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Chunked Video Uploader</h2>
      <input
        type="file"
        onChange={handleFileChange}
        className="mb-4 bg-gray-500 text-white px-4 py-2 rounded cursor-pointer"
        disabled={uploading}
        />

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={upload}
          disabled={uploading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 cursor-pointer"
        >
          Upload
        </button>
        <button
          onClick={pauseUpload}
          disabled={!uploading || paused}
          className="bg-yellow-500 text-white px-4 py-2 rounded disabled:opacity-50 cursor-pointer"
        >
          Pause
        </button>
        <button
          onClick={resumeUpload}
          disabled={!paused}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 cursor-pointer"
        >
          Resume
        </button>
      </div>

      <div className="w-full bg-gray-200 h-4 rounded-full">
        <div
          className="bg-blue-600 h-4 rounded-full"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="mt-2">Progress: {progress}%</p>

      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
      />
    </div>
  );
}
