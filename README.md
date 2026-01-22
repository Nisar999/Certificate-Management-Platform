# Certificate Management Platform

A production-ready platform for managing certificates, participants, and email campaigns.

## 🚀 Features

### 1. Template Management
-   **Create Templates**: Upload an image (Certificate Background) and define dynamic fields.
-   **Drag & Drop Editor**: Position Name, Date, and ID fields visually.
-   **Storage**: Images are stored securely in the database.

### 2. Participant Management
-   **Add Single**: Add participants manually.
-   **Bulk Import**: Import via JSON/CSV (Coming soon).
-   **Categories**: Organize participants by events (Technical, Non-Technical, etc.).

### 3. Certificate Generation
-   **On-the-fly Generation**: Certificates are generated instantly when downloaded.
-   **PDF Format**: High-quality PDF output.
-   **Batch Processing**: Generate for entire categories at once.

### 4. Mass Mailer
-   **Gmail Integration**: Send bulk emails using your Google Account.
-   **Tracking**: Monitor sent status (Mocked for safety in this version).

## 🛠️ Setup & Configuration

### Environment Variables
Required for the App to function:
-   `MONGODB_URI`: Connection string for MongoDB Atlas.
-   `JWT_SECRET`: Secret key for Admin sessions.
-   `GOOGLE_CLIENT_ID`: OAuth ID for Gmail.
-   `GOOGLE_CLIENT_SECRET`: OAuth Secret for Gmail.
-   `NODE_ENV`: Set to `production`.

### Local Development
1.  Clone the repo.
2.  Install dependencies:
    ```bash
    npm install
    cd client && npm install
    ```
3.  Set up `.env.local`:
    ```env
    MONGODB_URI=...
    JWT_SECRET=...
    ```
4.  Run:
    ```bash
    npm run dev
    ```

## 📚 API Reference
-   `GET /api/templates`: List templates
-   `POST /api/certificates/generate`: Generate certificate
-   `POST /api/auth/login`: Admin login

## 📜 License
MIT