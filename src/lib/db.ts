import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

let pool: mysql.Pool | null = null;
let isInitialized = false;

export const createConnectionPool = () => {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'B3lpasshooter1004.';
  const database = process.env.DB_NAME || 'omnihub_reporting';
  if (pool) pool.end().catch(() => {});
  pool = mysql.createPool({ host, user, password, database, enableKeepAlive: true, keepAliveInitialDelay: 10000, waitForConnections: true, connectionLimit: 50, queueLimit: 0, multipleStatements: true });
};

export const initDB = async () => {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'B3lpasshooter1004.';
  const database = process.env.DB_NAME || 'omnihub_reporting';

  while (!isInitialized) {
    try {
      console.log('[DATABASE] Connecting to MySQL...');
      const connection = await mysql.createConnection({ host, user, password });
      console.log('[DATABASE] Checking Database Existence...');
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
      await connection.query(`USE \`${database}\``);

      const tables = [
        {
          name: 'Users',
          query: `CREATE TABLE IF NOT EXISTS Users (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, firstName VARCHAR(255), lastName VARCHAR(255), role ENUM('user', 'admin') DEFAULT 'user', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`
        },
        {
          name: 'Videos',
          query: `CREATE TABLE IF NOT EXISTS Videos (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, title VARCHAR(255) NOT NULL, description TEXT, visibility ENUM('public', 'private', 'unlisted') DEFAULT 'public', category_id INT, allow_download BOOLEAN DEFAULT FALSE, status VARCHAR(50) DEFAULT 'processing', url VARCHAR(255), thumbnail VARCHAR(255), views INT DEFAULT 0, watch_time INT DEFAULT 0, deleted_at DATETIME NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE)`
        },
        {
          name: 'Playlists',
          query: `CREATE TABLE IF NOT EXISTS Playlists (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, title VARCHAR(255) NOT NULL, description TEXT, visibility ENUM('public', 'private') DEFAULT 'public', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE)`
        },
        {
          name: 'PlaylistVideos',
          query: `CREATE TABLE IF NOT EXISTS PlaylistVideos (playlist_id INT, video_id INT, added_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(playlist_id, video_id), FOREIGN KEY(playlist_id) REFERENCES Playlists(id) ON DELETE CASCADE, FOREIGN KEY(video_id) REFERENCES Videos(id) ON DELETE CASCADE)`
        },
        {
          name: 'Comments',
          query: `CREATE TABLE IF NOT EXISTS Comments (id INT AUTO_INCREMENT PRIMARY KEY, video_id INT, user_id INT, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(video_id) REFERENCES Videos(id) ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE)`
        },
        {
          name: 'Likes',
          query: `CREATE TABLE IF NOT EXISTS Likes (id INT AUTO_INCREMENT PRIMARY KEY, video_id INT, user_id INT, type ENUM('like', 'dislike') NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_like (video_id, user_id), FOREIGN KEY(video_id) REFERENCES Videos(id) ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE)`
        },
        {
          name: 'Subscriptions',
          query: `CREATE TABLE IF NOT EXISTS Subscriptions (id INT AUTO_INCREMENT PRIMARY KEY, subscriber_id INT, channel_id INT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_sub (subscriber_id, channel_id), FOREIGN KEY(subscriber_id) REFERENCES Users(id) ON DELETE CASCADE, FOREIGN KEY(channel_id) REFERENCES Users(id) ON DELETE CASCADE)`
        },
        {
          name: 'WatchHistory',
          query: `CREATE TABLE IF NOT EXISTS WatchHistory (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, video_id INT, watched_at DATETIME DEFAULT CURRENT_TIMESTAMP, watch_time INT DEFAULT 0, FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE, FOREIGN KEY(video_id) REFERENCES Videos(id) ON DELETE CASCADE)`
        },
        {
          name: 'admin_deletion_logs',
          query: `CREATE TABLE IF NOT EXISTS admin_deletion_logs (id INT AUTO_INCREMENT PRIMARY KEY, video_id INT, title VARCHAR(255), creator_name VARCHAR(255), archive_path VARCHAR(255), deleted_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`
        }
      ];

      for (const table of tables) {
        await connection.query(table.query);
        console.log(`[DATABASE] Table ${table.name} Verified.`);
      }

      // PATCH MISSING COLUMNS (Mencegah Error "Unknown Column")
      console.log('[DATABASE] Patching missing columns in Videos table (if any)...');
      const columnsToAdd = [
        "ADD COLUMN url VARCHAR(255)",
        "ADD COLUMN thumbnail VARCHAR(255)",
        "ADD COLUMN views INT DEFAULT 0",
        "ADD COLUMN watch_time INT DEFAULT 0"
      ];
      for (const col of columnsToAdd) {
        try {
          await connection.query(`ALTER TABLE Videos ${col}`);
        } catch (e: any) {
          // Abaikan error jika kolom sudah ada
        }
      }

      const [adminExists]: any = await connection.query(`SELECT id FROM Users WHERE email = 'admin@omnihub.local'`);
      if (adminExists.length === 0) {
        const hashedAdminPassword = await bcrypt.hash('admin1234#', 10);
        await connection.query(
          `INSERT INTO Users (email, password, firstName, lastName, role) VALUES (?, ?, 'System', 'Admin', 'admin')`,
          ['admin@omnihub.local', hashedAdminPassword]
        );
        console.log('[DATABASE] Default Admin account created successfully.');
      }

      console.log('[DATABASE] Initialization Complete. MySQL is ready.');
      connection.destroy();
      createConnectionPool();
      isInitialized = true;
    } catch (error: any) {
      console.error('[DATABASE] MySQL Connection Failed, retrying in 5s...', error.message);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

export const executeWithRetry = async (method: 'execute' | 'query', queryStr: string, params: any[] = []): Promise<any> => {
  if (!pool) throw new Error("MySQL Pool is not ready.");
  return await (pool as any)[method](queryStr, params);
};

const db = {
  execute: async (queryStr: string, params: any[] = []) => executeWithRetry('execute', queryStr, params),
  query: async (queryStr: string, params: any[] = []) => executeWithRetry('query', queryStr, params),
};

export default db;
