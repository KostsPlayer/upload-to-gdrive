import React, { useState, useEffect } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

function App() {
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [folderId, setFolderId] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [isFolderCreated, setIsFolderCreated] = useState(false);

  useEffect(() => {
    const loadGapi = () => {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => gapi.load("client", initializeGapiClient);
      document.body.appendChild(script);

      const gisScript = document.createElement("script");
      gisScript.src = "https://accounts.google.com/gsi/client";
      gisScript.onload = initializeGisClient;
      document.body.appendChild(gisScript);
    };

    const initializeGapiClient = async () => {
      await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
      });
      setGapiLoaded(true);
    };

    const initializeGisClient = () => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error("Authorization failed", tokenResponse.error);
          } else {
            setIsAuthorized(true);
          }
        },
      });
      setTokenClient(client);
    };

    loadGapi();
  }, []);

  const handleAuthClick = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  };

  const handleSignOutClick = () => {
    gapi.client.setToken("");
    setIsAuthorized(false);
    setFolderId(null);
    setIsFolderCreated(false);
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleFolderNameChange = (e) => {
    setFolderName(e.target.value);
  };

  const checkFolderExists = async () => {
    try {
      const response = await gapi.client.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
      });

      if (response.result.files && response.result.files.length > 0) {
        setFolderId(response.result.files[0].id);
        setIsFolderCreated(true);
        alert(`Folder "${folderName}" already exists.`);
      } else {
        createFolder();
      }
    } catch (error) {
      console.error("Error checking folder:", error);
    }
  };

  const createFolder = async () => {
    if (!folderName) {
      alert("Please enter a folder name.");
      return;
    }

    const folderMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };

    try {
      const response = await gapi.client.drive.files.create({
        resource: folderMetadata,
        fields: "id",
      });
      setFolderId(response.result.id);
      setIsFolderCreated(true);
      alert(`Folder "${folderName}" created successfully!`);
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("Error creating folder.");
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !isAuthorized || !folderId) {
      alert(
        "Please ensure you are authorized, have selected a file, and have created or selected a folder."
      );
      return;
    }

    const metadata = {
      name: selectedFile.name,
      mimeType: selectedFile.type,
      parents: [folderId], // Mengunggah ke folder yang baru dibuat atau dipilih
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", selectedFile);

    try {
      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: new Headers({
            Authorization: "Bearer " + gapi.client.getToken().access_token,
          }),
          body: form,
        }
      );
      const result = await response.json();
      console.log("File uploaded:", result);
      alert("File uploaded successfully!");
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  return (
    <div>
      <h1>Google Drive Integration</h1>
      {gapiLoaded ? (
        isAuthorized ? (
          <>
            <button onClick={handleSignOutClick}>Sign Out</button>
            <input
              type="text"
              placeholder="Enter folder name"
              value={folderName}
              onChange={handleFolderNameChange}
            />
            <button onClick={checkFolderExists}>Create or Check Folder</button>
            <input type="file" onChange={handleFileChange} accept=".pdf" />
            <button onClick={uploadFile} disabled={!isFolderCreated}>
              Upload to Google Drive
            </button>
          </>
        ) : (
          <button onClick={handleAuthClick}>Authorize</button>
        )
      ) : (
        <p>Loading Google API...</p>
      )}
    </div>
  );
}

export default App;
