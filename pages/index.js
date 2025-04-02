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
      // 1. Dapatkan file saat ini
      const getResponse = await axios.get(
        `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${repoConfig.path}`,
        {
          headers: {
            Authorization: `token ${repoConfig.token}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );
  
      // 2. Siapkan update
      const currentContent = JSON.parse(atob(getResponse.data.content));
      const newContent = {
        ...currentContent,
        items: [...(currentContent.items || []), inputValue]
      };
  
      // 3. Eksekusi update
      await axios.put(
        `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${repoConfig.path}`,
        {
          message: `Add item: ${inputValue.substring(0, 20)}...`,
          content: btoa(JSON.stringify(newContent, null, 2)),
          sha: getResponse.data.sha,
          branch: repoConfig.branch
        },
        {
          headers: {
            Authorization: `token ${repoConfig.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          }
        }
      );
  
      // Perbaikan: Pastikan semua statement dipisahkan dengan benar
      setInputValue('');
      setMessage('✅ Update berhasil!');
      fetchData();
    } catch (error) {
      let errorMessage = '❌ Gagal update: ';
      
      if (error.response) {
        switch (error.response.status) {
          case 403:
            if (error.response.headers['x-ratelimit-remaining'] === '0') {
              const resetTime = new Date(error.response.headers['x-ratelimit-reset'] * 1000);
              errorMessage += `Rate limit exceeded. Coba lagi setelah ${resetTime.toLocaleTimeString()}`;
            } else {
              errorMessage += 'Akses ditolak. Periksa token Anda.';
            }
            break;
          case 404:
            errorMessage += 'File tidak ditemukan.';
            break;
          case 422:
            errorMessage += 'SHA tidak valid atau konflik.';
            break;
          default:
            errorMessage += `Error ${error.response.status}`;
        }
      } else {
        errorMessage += error.message;
      }
  
      setMessage(errorMessage);
      console.error('Error details:', {
        config: error.config,
        response: error.response?.data
      });
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
