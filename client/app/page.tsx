"use client";
import { useState } from "react";

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string>("");
  const [mood, setMood] = useState<string>("");
  const [songs, setSongs] = useState<any[]>([]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setImage(f);
    setSongs([]);
    setText("");
    setMood("");
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append("image", image);
      const res = await fetch("/api/analyze-document", { method: "POST", body: form });
      const data = await res.json();
      setText(data.text || "");
      setMood(data.mood || "");
      setSongs(data.recommendations || []);
    } catch (e) {
      console.error(e);
      alert("Error analyzing image. Make sure you have a valid image with text.");
    } finally {
      setLoading(false);
    }
  };

  const fetchByMood = async () => {
    if (!mood) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/recommendations?mood=${encodeURIComponent(mood)}`);
      const data = await res.json();
      setSongs(data.songs || []);
    } catch (e) {
      console.error(e);
      alert("Error fetching recommendations.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16">
        {/* Header */}
        <section className="text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-3">Musicana</h1>
          <p className="text-lg max-w-2xl mx-auto">
            Capture a page, feel the vibe, and let Musicana pick the perfect tracks for your mood.
          </p>
        </section>

        {/* Upload Section */}
        <section className="glass-card rounded-2xl p-8">
          <div className="flex flex-col items-center gap-6">
            <label className="glass-card cursor-pointer rounded-xl p-8 text-center hover:bg-opacity-80 transition-all w-full max-w-md">
              <input type="file" accept="image/*" onChange={onFile} className="hidden" />
              <div className="space-y-2">
                <div className="text-4xl">📸</div>
                <p className="font-semibold">
                  {image ? image.name : "Click to upload image"}
                </p>
                <p className="text-sm text-muted-foreground">PNG, JPG or JPEG</p>
              </div>
            </label>

            <button
              className="cta-button"
              onClick={handleAnalyze}
              disabled={!image || loading}
            >
              {loading ? "Analyzing…" : "Analyze my page"}
            </button>
          </div>
        </section>

        {/* Results */}
        {preview && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Preview */}
            <section className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4">📷 Your Image</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="preview"
                className="w-full rounded-xl border"
              />
            </section>

            {/* Analysis */}
            <section className="glass-card rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">📊 Analysis</h2>

              {mood && (
                <div className="pill">
                  Mood: <span className="font-bold capitalize">{mood}</span>
                </div>
              )}

              <div className="bg-white/5 rounded-xl p-4 max-h-64 overflow-y-auto">
                <p className="text-sm whitespace-pre-line">
                  {text || "No text extracted yet."}
                </p>
              </div>

              <button
                className="cta-button w-full"
                onClick={fetchByMood}
                disabled={!mood || loading}
              >
                {loading ? "Finding tracks…" : "🎵 Discover Music"}
              </button>
            </section>
          </div>
        )}

        {/* Songs Grid */}
        {songs.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-center">🎵 Your Playlist ({songs.length} songs)</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {songs.map((song, idx) => (
                <div
                  key={idx}
                  className="glass-card rounded-xl overflow-hidden hover:bg-opacity-80 transition-all flex flex-col"
                >
                  {/* Thumbnail */}
                  {song.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-full h-auto object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                      <span className="text-4xl">🎵</span>
                    </div>
                  )}

                  {/* Song Info */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col">
                    <h3 className="font-bold line-clamp-2 text-sm">
                      {song.title || "Unknown Title"}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-1 flex-1">
                      {song.artist || "Unknown Artist"}
                    </p>

                    {song.url && (
                      <a
                        href={song.url}
                        target="_blank"
                        rel="noreferrer"
                        className="cta-ghost inline-block text-center text-sm w-full"
                      >
                        Play →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
