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

//Loading Logs with details
async function loadEmployees(filterId = null) {
  const status = document.getElementById("adminStatus");
  const logsContainer = document.getElementById("logsContainer");
  const logsHeader = document.getElementById("logsHeader");
  const logsTableBody = document.querySelector("#logsTable tbody");

  const statsPanel = document.getElementById("employeeAnalyticsPanel");
  const statsDiv = document.getElementById("employeeStats");
  const heatmapDiv = document.getElementById("heatmapContainer");
  const adminDiv = document.getElementById("adminLeaderboard");

  try {
    const url = filterId
      ? `https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/getEmployeeDetailsAdmin?employeeId=${encodeURIComponent(filterId)}`
      : `https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/getEmployeeDetailsAdmin`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      status.textContent = `❌ Failed to load employees: ${data.error}`;
      return;
    }

    // 🧑‍💼 Render employee table
    const tableBody = document.querySelector("#employeeTable tbody");
    tableBody.innerHTML = "";
    data.employees.forEach(emp => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${emp.EmployeeID}</td>
        <td>${emp.Name}</td>
        <td>${emp.FaceId || '—'}</td>
        <td>${emp.CreatedAt || '—'}</td>
        <td>
          <button class="editBtn" data-id="${emp.EmployeeID}" data-name="${emp.Name}">✏️ Edit</button>
          <button class="delete-btn" data-id="${emp.EmployeeID}" style="margin-left: 5px;">🗑️ Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    attachEditButtons();
    attachDeleteButtons();

    // 📜 Render logs (if any)
    if (data.logs && data.logs.length > 0) {
      logsHeader.style.display = "block";
      logsContainer.style.display = "block";
      logsTableBody.innerHTML = "";

      data.logs.forEach(log => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${log.TimestampIST || "—"}</td>
          <td>${log.Timestamp || "—"}</td>
          <td>${log.Address || "—"}</td>
          <td>${log.Pincode || "—"}</td>
        `;
        logsTableBody.appendChild(row);
      });
    } else {
      logsHeader.style.display = "none";
      logsContainer.style.display = "none";
      logsTableBody.innerHTML = "";
    }

    // 📊 Analytics Section
    if (data.attendanceStats) {
      statsPanel.style.display = "block";
      const stats = data.attendanceStats;

      if (filterId) {
        const stat = stats.find(s => s.employeeId === filterId);
        statsDiv.innerHTML = stat
          ? `🔢 Total check-ins for <b>${filterId}</b>: <strong>${stat.count}</strong>`
          : "No check-in data.";
        heatmapDiv.innerHTML = "";
        adminDiv.innerHTML = "";
      } else {
        statsDiv.innerHTML = `
          <h4>🏆 Top Employees by Check-ins</h4>
          <ol>${stats.slice(0, 5).map(s => `<li>${s.employeeId} — ${s.count}</li>`).join("")}</ol>
        `;

        // 🧑‍💻 Admin leaderboard
        if (data.adminRanking && data.adminRanking.length) {
          adminDiv.innerHTML = `
            <h4>🧑‍💻 Admin Activity Leaderboard</h4>
            <ol>${data.adminRanking.slice(0, 5).map(([admin, count]) => `<li>${admin}: ${count} actions</li>`).join("")}</ol>
          `;
        }

        // 📅 Basic heatmap rendering
        if (data.heatmap && Object.keys(data.heatmap).length) {
          heatmapDiv.innerHTML = `
            <h4>📅 Daily Check-ins (Heatmap-style)</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${Object.entries(data.heatmap).map(([date, count]) => `
                <div title="${date}: ${count}" style="
                  width: 20px; height: 20px;
                  background-color: rgba(0, 128, 0, ${Math.min(1, count / 10)});
                  border: 1px solid #ccc;
                "></div>
              `).join("")}
            </div>
          `;
        } else {
          heatmapDiv.innerHTML = "";
        }
      }
    } else {
      statsPanel.style.display = "none";
    }

  } catch (err) {
    console.error("Load employees error:", err);
    status.textContent = "❌ Unable to fetch employees.";
  }
}


loadEmployees(); // Load on page load

// Enhanced Search and Clear Logic
const searchInput = document.getElementById("searchInput");
const suggestionsBox = document.getElementById("searchSuggestions");

// Real-time input listener
searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    suggestionsBox.style.display = "none";
    resetTableAndLogs();
    return;
  }

  try {
  const response = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/getEmployeeDetailsAdmin", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    }
  });

  const data = await response.json();

  const matches = data.employees.filter(emp => {
    return emp.EmployeeID.toLowerCase().includes(query) ||
           emp.Name.toLowerCase().includes(query);
  });

  suggestionsBox.innerHTML = "";

  if (matches.length > 0) {
    suggestionsBox.style.display = "block";
    matches.forEach(match => {
      const li = document.createElement("li");
      li.textContent = `${match.Name} (${match.EmployeeID})`;
      li.style.padding = "6px";
      li.style.cursor = "pointer";
      li.style.borderBottom = "1px solid #eee";

      //.. working onit
      li.addEventListener("click", async () => {
        const employeeId = match.EmployeeID;
        searchInput.value = match.Name;
        suggestionsBox.style.display = "none";
        try {
          const res = await fetch(`https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/getEmployeeDetailsAdmin?employeeId=${employeeId}`, {
            method: 'GET',
            headers: {
              "Content-Type": "application/json",
              'Authorization': `Bearer ${accessToken}`
            }
          });
          const data = await res.json();
          const { employees, logs } = data;
          // 🔥 Add this line to properly filter table + logs
          await loadEmployees(employeeId);
          displayEmployeeAnalytics(employeeId, employees, logs);
          document.getElementById("employeeAnalyticsPanel").style.display = "block";
        } catch (err) {
          console.error("Analytics fetch failed:", err);
          showToast("❌ Failed to load employee analytics");
        }
      });
      suggestionsBox.appendChild(li);
    });
  } else {
    suggestionsBox.style.display = "none";
  }
  } catch (err) {
    console.error("Suggestion error:", err);
  }
});


//...
function resetTableAndLogs() {
  loadEmployees();  // Reload all rows from backend
  document.getElementById("logsHeader").style.display = "none";
  document.getElementById("logsContainer").style.display = "none";
}

// Optional: clear button logic
function clearSearch() {
  searchInput.value = "";
  suggestionsBox.style.display = "none";
  resetTableAndLogs();
}
//clear button logic
document.querySelector('button[onclick="clearSearch()"]').addEventListener("click", function () {
  document.getElementById("searchInput").value = "";
  const rows = document.querySelectorAll("#employeeTable tbody tr");

  rows.forEach(row => {
    row.style.display = "";
    Array.from(row.children).forEach(cell => {
      cell.innerHTML = cell.textContent; // Remove highlights
    });
  });

  document.getElementById("logsHeader").style.display = "none";
  document.getElementById("logsContainer").style.display = "none";

  // Optionally reload logs or just reset view
  loadEmployees(); // Only needed if you dynamically load the table
});


function attachEditButtons() {
  const buttons = document.querySelectorAll(".editBtn");
  buttons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const empId = btn.dataset.id;
      const currentName = btn.dataset.name;
      const newName = prompt(`Enter new name for Employee ID ${empId}:`, currentName);
      if (!newName || newName.trim() === "") return;

      try {
        const res = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/updateEmployeeNameAdmin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ employeeId: empId, name: newName.trim() })
        });

        const result = await res.json();
        if (res.ok) {
          alert("✅ Name updated successfully.");
          loadEmployees(); // reload
        } else {
          alert(`❌ Error: ${result.error || "Update failed"}`);
        }
      } catch (err) {
        alert("❌ Network error.");
        console.error(err);
      }
    });
  });
}

//...
async function loadAttendanceStats() {
  try {
    const res = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/getAttendanceStats", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    });
    const stats = await res.json();
    const list = document.getElementById("topAttendanceStats");
    list.innerHTML = "";

    // Sort descending by count
    stats.sort((a, b) => b.count - a.count);

    stats.slice(0, 5).forEach(item => {
      const li = document.createElement("li");
      li.textContent = `${item.employeeId} — ${item.count} check-ins`;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Stats error:", err);
  }
}
loadAttendanceStats();
//...

function attachDeleteButtons() {
  const deleteButtons = document.querySelectorAll('.delete-btn');

  deleteButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const employeeId = button.dataset.id;

      const userInput = prompt(`To confirm deletion, type the Employee ID: "${employeeId}"`);

      if (userInput !== employeeId) {
        alert("❌ Employee ID did not match. Deletion cancelled.");
        return;
      }

      try {
        const token = localStorage.getItem("access_token"); // Or wherever you're storing it

        const response = await fetch('https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/deleteEmployeeAdmin', {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            employeeId: employeeId,
            confirmId: userInput // 🔐 Match confirmation
            })
        });

        const result = await response.json();

        if (response.ok) {
          alert(`✅ ${result.message}`);
          button.closest('tr').remove(); // Remove row from table
        } else {
          alert(`❌ ${result.error || 'Delete failed'}`);
        }
      } catch (err) {
        console.error("Delete error:", err);
        alert("❌ Failed to delete employee.");
      }
    });
  });
}

//adding logging get logs
document.getElementById("showAnalyticsBtn").addEventListener("click", async () => {
  const panel = document.getElementById("analyticsPanel");
  const content = document.getElementById("analyticsContent");
  panel.style.display = "block";
  content.innerHTML = "⏳ Loading...";

  try {
    const token = localStorage.getItem("token"); // or however you store it
    const response = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/prod/getAdminLogs", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
    });

    if (!response.ok) throw new Error("Failed to fetch logs");
    const data = await response.json();

    if (!data.logs || data.logs.length === 0) {
      content.innerHTML = "No logs found.";
    } else {
      content.innerHTML = `
        <ul style="padding-left: 20px;">
          ${data.logs.map(log => `
            <li>
              🕒 <b>${log.Timestamp}</b><br>
              👤 <b>${log.AdminID}</b> performed <b>${log.ActionType}</b> on <b>${log.TargetEmployeeID}</b><br>
              📝 ${log.Details}
            </li>
          `).join("")}
        </ul>
      `;
    }
  } catch (err) {
    console.error(err);
    content.innerHTML = `❌ Error: ${err.message}`;
  }
});

function displayEmployeeAnalytics(employeeId, employees, logs) {
  const analyticsPanel = document.getElementById("employeeAnalyticsPanel");
  const statsContainer = document.getElementById("employeeStats");
  const heatmapContainer = document.getElementById("heatmapContainer");
  const leaderboardContainer = document.getElementById("adminLeaderboard");

  analyticsPanel.style.display = "block";
  statsContainer.innerHTML = "";
  heatmapContainer.innerHTML = "";
  leaderboardContainer.innerHTML = "";

  if (employeeId && employees.length && logs.length) {
    const user = employees[0];
    const totalDays = logs.length;

    const locationSet = new Set(logs.map(log => log.Address).filter(Boolean));
    const lastMarked = logs[logs.length - 1]?.TimestampIST || "N/A";

    statsContainer.innerHTML = `
      <p><b>Employee:</b> ${user.Name} (${user.EmployeeID})</p>
      <p><b>Total Attendances:</b> ${totalDays}</p>
      <p><b>Unique Locations:</b> ${locationSet.size}</p>
      <p><b>Last Attendance:</b> ${lastMarked}</p>
    `;

    // TODO: Plot per-day heatmap, e.g., bar chart from logs
    heatmapContainer.innerHTML = "<p>📅 Per-day attendance heatmap will go here.</p>";
  } else {
    statsContainer.innerHTML = `<p>No employee selected. Showing overall analytics.</p>`;
    
    // TODO: Generate global stats from previously scanned data
    heatmapContainer.innerHTML = "<p>🌍 Global heatmap / attendance distribution here.</p>";
    leaderboardContainer.innerHTML = "<p>🏆 Admin leaderboard / active employees here.</p>";
  }
}

document.getElementById("toggleLogsBtn").addEventListener("click", () => {
  const logsContainer = document.getElementById("logsContainer");
  logsContainer.style.display = logsContainer.style.display === "none" ? "block" : "none";
});

