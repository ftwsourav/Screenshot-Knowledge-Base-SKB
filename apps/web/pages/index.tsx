import { useState, useEffect } from 'react';
import axios from 'axios';

interface Screenshot {
  id: string;
  file_path: string;
  created_at: number;
  snippet?: string;
}

export default function Home() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadScreenshots();
  }, []);

  const loadScreenshots = async () => {
    try {
      const response = await axios.get('http://localhost:5656/api/screenshots');
      setScreenshots(response.data);
    } catch (error) {
      console.error('Failed to load screenshots:', error);
    }
  };

  const handleSearch = async () => {
    try {
      const response = await axios.get(`http://localhost:5656/api/screenshots?q=${query}`);
      setScreenshots(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('http://localhost:5656/api/import', formData);
      loadScreenshots();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Screenshot Knowledge Base</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search screenshots..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border p-2 mr-2"
        />
        <button onClick={handleSearch} className="bg-blue-500 text-white px-4 py-2">
          Search
        </button>
      </div>

      <div className="mb-4">
        <input type="file" accept="image/*" onChange={handleFileUpload} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {screenshots.map((screenshot) => (
          <div key={screenshot.id} className="border p-4">
            <img
              src={`http://localhost:5656/images/${screenshot.id}.png`}
              alt="Screenshot"
              className="w-full h-32 object-cover mb-2"
            />
            <p className="text-sm text-gray-600">
              {new Date(screenshot.created_at).toLocaleDateString()}
            </p>
            {screenshot.snippet && (
              <p className="text-sm">{screenshot.snippet}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}