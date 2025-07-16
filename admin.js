document.getElementById("addUserForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const employeeId = document.getElementById("employeeId").value.trim();
  const name = document.getElementById("fullName").value.trim();
  const fileInput = document.getElementById("faceImage");
  const status = document.getElementById("adminStatus");

  // Get token from localStorage
  const token = localStorage.getItem("access_token");
  if (!token) {
    status.textContent = "❌ Not authenticated. Please login again.";
    return;
  }

  if (!fileInput.files.length) {
    status.textContent = "Please select an image file.";
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onloadend = async () => {
    const base64Data = reader.result.split(',')[1];

    const payload = {
      employeeId,
      name,
      imageData: base64Data
    };

    try {
      const response = await fetch('https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/addUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ✅ Attach Cognito access token here
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok) {
        status.textContent = `✅ ${result.message || "User added and indexed successfully."}`;
      } else {
        status.textContent = `❌ ${result.error || "Something went wrong."}`;
      }
    } catch (err) {
      console.error("Error:", err);
      status.textContent = "❌ Failed to connect to backend.";
    }
  };

  reader.readAsDataURL(file);
});

// Logout handler
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("id_token");
  window.location.href = "https://face-attendance-admin-auth.auth.us-east-1.amazoncognito.com/logout?client_id=5r9fdn5ja386taccaljn7qdlm7&logout_uri=https://cloudtechmadan.github.io/my-website/index.html";
});
