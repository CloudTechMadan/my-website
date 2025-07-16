document.getElementById("addUserForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const employeeId = document.getElementById("employeeId").value.trim();
  const name = document.getElementById("fullName").value.trim();
  const fileInput = document.getElementById("faceImage");
  const status = document.getElementById("adminStatus");

  if (!fileInput.files.length) {
    status.textContent = "Please select an image file.";
    return;
  }

  // Read image as base64
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64Data = reader.result.split(',')[1]; // Strip "data:image/jpeg;base64,"

    const payload = {
      employeeId,
      name,
      imageData: base64Data
    };

    try {
      const response = await fetch('https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/addUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
