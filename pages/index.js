import { useState, useEffect } from 'react';
import axios from 'axios';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Config GitHub dari environment variables
  const repoConfig = {
    owner: process.env.NEXT_PUBLIC_GITHUB_OWNER,
    repo: process.env.NEXT_PUBLIC_GITHUB_REPO,
    path: process.env.NEXT_PUBLIC_GITHUB_FILE_PATH || 'data.json',
    branch: process.env.NEXT_PUBLIC_GITHUB_BRANCH || 'main',
    token: process.env.NEXT_PUBLIC_GITHUB_TOKEN,
  };

  // Load data awal
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${repoConfig.path}`,
        {
          headers: {
            Authorization: `token ${repoConfig.token}`,
          },
        }
      );
      
      const content = JSON.parse(atob(response.data.content));
      setItems(content.items || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setItems([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsLoading(true);
    setMessage('');

    try {
      // 1. Dapatkan file saat ini untuk mendapatkan SHA
      const currentFile = await axios.get(
        `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${repoConfig.path}`,
        {
          headers: {
            Authorization: `token ${repoConfig.token}`,
          },
        }
      );

      // 2. Buat konten baru
      const currentContent = JSON.parse(atob(currentFile.data.content));
      const newContent = {
        ...currentContent,
        items: [...(currentContent.items || []), inputValue],
      };

      // 3. Update file di GitHub
      await axios.put(
        `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${repoConfig.path}`,
        {
          message: `Add new item: ${inputValue}`,
          content: btoa(JSON.stringify(newContent, null, 2)),
          sha: currentFile.data.sha,
          branch: repoConfig.branch,
        },
        {
          headers: {
            Authorization: `token ${repoConfig.token}`,
          },
        }
      );

      setInputValue('');
      setMessage('✅ Item berhasil ditambahkan ke GitHub!');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating file:', error);
      setMessage('❌ Gagal menambahkan item. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.splitContainer}>
        {/* Bagian Kiri - Editor */}
        <div className={styles.editorSection}>
          <h1>GitHub JSON Editor</h1>
          <form onSubmit={handleSubmit} className={styles.form}>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Masukkan teks..."
              className={styles.textarea}
              rows={5}
            />
            <button 
              type="submit" 
              className={styles.button}
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? 'Mengirim...' : 'Submit ke GitHub'}
            </button>
          </form>
          {message && <p className={styles.message}>{message}</p>}
        </div>

        {/* Bagian Kanan - Display */}
        <div className={styles.displaySection}>
          <h2>Items dari GitHub:</h2>
          <div className={styles.itemsContainer}>
            {items.length > 0 ? (
              items.map((item, index) => (
                <div key={index} className={styles.itemBox}>
                  {item}
                </div>
              ))
            ) : (
              <p>Tidak ada item. Tambahkan melalui editor di sebelah kiri.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
