function isTokenExpired(token) {
  try {
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(atob(payloadBase64));
    const exp = payload.exp * 1000;
    return Date.now() > exp;
  } catch {
    return true;
  }
}

const accessToken = localStorage.getItem("access_token");
const idToken = localStorage.getItem("id_token");

if (!accessToken || isTokenExpired(accessToken)) {
  localStorage.clear();
  window.location.href =
    "https://face-attendance-admin-auth.auth.us-east-1.amazoncognito.com/login?client_id=64pn554o9iae8at36o356j1ba1&response_type=token&scope=openid+email+profile+admin-api/admin-access&redirect_uri=https://cloudtechmadan.github.io/my-website/index.html";
}

function showUserInfo(token) {
  try {
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(atob(payloadBase64));
    const email = payload.email || payload["cognito:username"] || "Unknown user";
    document.getElementById("userInfo").innerHTML = `👤 Logged in as <strong>${email}</strong>`;
  } catch {
    document.getElementById("userInfo").textContent = "Logged in";
  }
}

showUserInfo(idToken);

document.getElementById("addUserForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const employeeId = document.getElementById("employeeId").value.trim();
  const name = document.getElementById("fullName").value.trim();
  const fileInput = document.getElementById("faceImage");
  const status = document.getElementById("adminStatus");

  if (!fileInput.files.length) {
    status.textContent = "❌ Please upload an image.";
    return;
  }

  const file = fileInput.files[0];

  if (file.size > 2 * 1024 * 1024) {
    status.textContent = "❌ Image too large. Max 2MB.";
    return;
  }

  const reader = new FileReader();

  reader.onload = async function () {
    if (!reader.result.includes(',')) {
      status.textContent = "❌ Failed to read image.";
      return;
    }

    const base64Image = reader.result.split(',')[1];

    try {
      status.textContent = "⏳ Uploading...";
      const response = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/addUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          employeeId,
          name,
          image: base64Image
        })
      });

      const result = await response.json();
      if (response.ok) {
        status.textContent = "✅ User added successfully!";
        document.getElementById("addUserForm").reset();
      } else {
        status.textContent = `❌ Error: ${result.error || result.message || "Something went wrong"}`;
      }
    } catch (err) {
      console.error("Add user error:", err);
      status.textContent = "❌ Failed to add user.";
    }
  };

  reader.readAsDataURL(file);
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.clear();
  window.location.href =
    "https://face-attendance-admin-auth.auth.us-east-1.amazoncognito.com/logout?client_id=64pn554o9iae8at36o356j1ba1&logout_uri=https://cloudtechmadan.github.io/my-website/index.html";
});
