import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

export interface ImageMetadata {
  id: number;
  prompt: string;
  imageUrl: string;
  backblazeUrl: string;
  seed: number;
  width: number;
  height: number;
  contentType: string;
  hasNsfwConcepts: string;
  fullResult: string;
  createdAt: string;
  userId: string;
}

export interface User {
  id: string; // Changed to string to match Auth0 user ID
  name: string | null;
  email: string | null;
}

export interface Transaction {
  id: number;
  userId: string;
  creditsPurchased: number;
  amountPaid: number; // Stripe handles amounts in cents
  purchaseDate: string;
}

export class DatabaseAPI {
  private db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

  async initialize() {
    if (this.db) return;

    const dbPath = path.join(process.cwd(), 'database.sqlite');
    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Initialize tables, excluding credit management
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT
      );

      CREATE TABLE IF NOT EXISTS image_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt TEXT,
        imageUrl TEXT,
        backblazeUrl TEXT,
        seed INTEGER,
        width INTEGER,
        height INTEGER,
        contentType TEXT,
        hasNsfwConcepts TEXT,
        fullResult TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        userId TEXT,
        FOREIGN KEY(userId) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        creditsPurchased INTEGER NOT NULL,
        amountPaid INTEGER NOT NULL, -- Stripe uses amounts in cents
        purchaseDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id)
      );
    `);
  }

  // Create a new user
  async createUser(
    id: string,
    name: string | null,
    email: string | null,
  ): Promise<User> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [
      id,
      name,
      email,
    ]);

    const user = await this.getUserById(id);
    if (!user) throw new Error('Failed to create user');

    return user;
  }

  // Retrieve a user by ID
  async getUserById(id: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    const user = await this.db.get<User>(
      'SELECT * FROM users WHERE id = ?',
      id,
    );
    return user || null;
  }

  // Record a transaction when a user purchases credits
  async recordTransaction(
    userId: string,
    creditsPurchased: number,
    amountPaid: number,
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `INSERT INTO transactions (userId, creditsPurchased, amountPaid) VALUES (?, ?, ?)`,
      [userId, creditsPurchased, amountPaid],
    );
  }

  // Save image metadata
  async saveImageMetadata(
    data: Omit<ImageMetadata, 'id' | 'createdAt'>,
  ): Promise<ImageMetadata> {
    if (!this.db) throw new Error('Database not initialized');

    const { lastID } = await this.db.run(
      `INSERT INTO image_metadata (
        prompt, imageUrl, backblazeUrl, seed, width, height, contentType, hasNsfwConcepts, fullResult, userId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.prompt,
        data.imageUrl,
        data.backblazeUrl,
        data.seed,
        data.width,
        data.height,
        data.contentType,
        data.hasNsfwConcepts,
        data.fullResult,
        data.userId,
      ],
    );

    const savedData = await this.db.get<ImageMetadata>(
      'SELECT * FROM image_metadata WHERE id = ?',
      lastID,
    );
    if (!savedData) throw new Error('Failed to retrieve saved data');

    return savedData;
  }

  // Get recent images (optionally filtered by user)
  async getRecentImages(
    limit: number = 20,
    userId?: string,
  ): Promise<ImageMetadata[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = userId
      ? 'SELECT * FROM image_metadata WHERE userId = ? ORDER BY createdAt DESC LIMIT ?'
      : 'SELECT * FROM image_metadata ORDER BY createdAt DESC LIMIT ?';

    const params = userId ? [userId, limit] : [limit];

    return this.db.all<ImageMetadata[]>(query, ...params);
  }

  // Close the database connection
  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export const databaseAPI = new DatabaseAPI();
