/**
 * TaskFlow Shared State and Logic
 */

const DEFAULT_TASKS = [
  {
    id: "1718550000000",
    title: "Design Database Schema",
    description: "Draft the initial Entity-Relationship diagram for the new user management module. Ensure constraints are clearly mapped out for user roles.",
    dueDate: "2026-10-24",
    priority: "High",
    status: "Pending"
  },
  {
    id: "1718550000001",
    title: "Update Dependencies",
    description: "Upgrade all project dependencies, especially core dev tools, and run integration test suites to check compatibility.",
    dueDate: "2026-10-20",
    priority: "Low",
    status: "Completed"
  }
];

// LocalStorage helpers
function getTasks() {
  const tasksJSON = localStorage.getItem("taskflow_tasks");
  if (!tasksJSON) {
    localStorage.setItem("taskflow_tasks", JSON.stringify(DEFAULT_TASKS));
    return DEFAULT_TASKS;
  }
  return JSON.parse(tasksJSON);
}

function saveTasks(tasks) {
  localStorage.setItem("taskflow_tasks", JSON.stringify(tasks));
}

// Utility: Format Date (YYYY-MM-DD -> MMM DD, YYYY)
function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00"); // Standardize to local time midnight
  if (isNaN(date)) return dateStr;
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Utility: Escape HTML to prevent XSS
function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
}

// Navbar dynamic pending counter
function updateNavbarBadge() {
  const tasks = getTasks();
  const pendingCount = tasks.filter(t => t.status === "Pending").length;
  
  const navLinks = document.querySelectorAll("nav a");
  navLinks.forEach(link => {
    // Match based on pathname or href attribute
    const href = link.getAttribute("href");
    if (href === "task-list.html" || href.endsWith("/task-list.html")) {
      const existingBadge = link.querySelector(".nav-badge");
      if (existingBadge) {
        existingBadge.remove();
      }
      if (pendingCount > 0) {
        const badge = document.createElement("span");
        badge.className = "nav-badge";
        badge.textContent = pendingCount;
        link.appendChild(badge);
      }
    }
  });
}

// Page initializer router
document.addEventListener("DOMContentLoaded", () => {
  // Always update navbar counts
  updateNavbarBadge();

  // Route to correct script based on hook elements on the pages
  if (document.getElementById("dashboard-stats")) {
    initDashboard();
  } else if (document.getElementById("add-task-form")) {
    initAddTask();
  } else if (document.getElementById("task-list-table")) {
    initTaskList();
  } else if (document.getElementById("task-detail-container")) {
    initTaskDetail();
  }
});

/**
 * Dashboard Logic
 */
function initDashboard() {
  const tasks = getTasks();
  const total = tasks.length;
  const pending = tasks.filter(t => t.status === "Pending").length;
  const completed = tasks.filter(t => t.status === "Completed").length;

  document.getElementById("total-tasks").textContent = total;
  document.getElementById("pending-tasks").textContent = pending;
  document.getElementById("completed-tasks").textContent = completed;

  const upcomingContainer = document.getElementById("upcoming-tasks");
  if (upcomingContainer) {
    upcomingContainer.innerHTML = "";
    
    // Sort logic: High priority first, then Medium, then Low, then sorted by due date
    const priorityWeight = { "High": 3, "Medium": 2, "Low": 1 };
    const pendingTasks = tasks
      .filter(t => t.status === "Pending")
      .sort((a, b) => {
        const pA = priorityWeight[a.priority] || 0;
        const pB = priorityWeight[b.priority] || 0;
        if (pB !== pA) return pB - pA;
        return new Date(a.dueDate) - new Date(b.dueDate);
      })
      .slice(0, 3);

    if (pendingTasks.length === 0) {
      upcomingContainer.innerHTML = `<li class="empty-state">No pending tasks! You are all caught up. 🎉</li>`;
    } else {
      pendingTasks.forEach(task => {
        const item = document.createElement("li");
        item.className = "dashboard-item";
        
        let priorityClass = "badge-low";
        if (task.priority === "High") priorityClass = "badge-high";
        else if (task.priority === "Medium") priorityClass = "badge-medium";
        
        item.innerHTML = `
          <div>
            <a href="task-detail.html?id=${task.id}" style="color: var(--text); font-weight: bold; text-decoration: underline;">
              ${escapeHTML(task.title)}
            </a>
            <div style="font-size: 0.85rem; margin-top: 0.25rem;">Due: ${formatDate(task.dueDate)}</div>
          </div>
          <span class="badge ${priorityClass}">${task.priority}</span>
        `;
        upcomingContainer.appendChild(item);
      });
    }
  }
}

/**
 * Add Task Logic
 */
function initAddTask() {
  const form = document.getElementById("add-task-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const titleInput = document.getElementById("task-title");
    const descInput = document.getElementById("task-desc");
    const dueInput = document.getElementById("task-due");
    const priorityInput = document.getElementById("task-priority");

    const newTask = {
      id: Date.now().toString(),
      title: titleInput.value.trim(),
      description: descInput.value.trim(),
      dueDate: dueInput.value,
      priority: priorityInput.value,
      status: "Pending"
    };

    const tasks = getTasks();
    tasks.push(newTask);
    saveTasks(tasks);

    // Redirect to task list
    window.location.href = "task-list.html";
  });
}

/**
 * Task List Logic
 */
function initTaskList() {
  const tasks = getTasks();
  let currentFilter = "All";

  const tableBody = document.getElementById("task-list-body");
  const filterAll = document.getElementById("filter-all");
  const filterPending = document.getElementById("filter-pending");
  const filterCompleted = document.getElementById("filter-completed");

  function renderTable() {
    tableBody.innerHTML = "";
    
    const filteredTasks = tasks.filter(task => {
      if (currentFilter === "Pending") return task.status === "Pending";
      if (currentFilter === "Completed") return task.status === "Completed";
      return true;
    });

    if (filteredTasks.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="4" class="empty-state">No tasks found matching filter: "${currentFilter}".</td>`;
      tableBody.appendChild(row);
      return;
    }

    filteredTasks.forEach(task => {
      const row = document.createElement("tr");
      
      let priorityClass = "badge-low";
      if (task.priority === "High") priorityClass = "badge-high";
      else if (task.priority === "Medium") priorityClass = "badge-medium";

      row.innerHTML = `
        <td><a href="task-detail.html?id=${task.id}" style="color: var(--text); font-weight: bold;">${escapeHTML(task.title)}</a></td>
        <td>${formatDate(task.dueDate)}</td>
        <td><span class="badge ${priorityClass}">${task.priority}</span></td>
        <td><strong>${task.status}</strong></td>
      `;
      tableBody.appendChild(row);
    });
  }

  function setActiveFilterButton(activeBtn) {
    [filterAll, filterPending, filterCompleted].forEach(btn => {
      if (btn) btn.classList.remove("btn-active");
    });
    if (activeBtn) activeBtn.classList.add("btn-active");
  }

  if (filterAll) {
    filterAll.addEventListener("click", () => {
      currentFilter = "All";
      setActiveFilterButton(filterAll);
      renderTable();
    });
  }

  if (filterPending) {
    filterPending.addEventListener("click", () => {
      currentFilter = "Pending";
      setActiveFilterButton(filterPending);
      renderTable();
    });
  }

  if (filterCompleted) {
    filterCompleted.addEventListener("click", () => {
      currentFilter = "Completed";
      setActiveFilterButton(filterCompleted);
      renderTable();
    });
  }

  // Initial render
  renderTable();
  setActiveFilterButton(filterAll);
}

/**
 * Task Detail Logic
 */
function initTaskDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get("id");
  const detailContainer = document.getElementById("task-detail-container");

  if (!detailContainer) return;

  const tasks = getTasks();
  const task = tasks.find(t => t.id === taskId);

  if (!taskId || !task) {
    detailContainer.innerHTML = `
      <div class="error-container">
        <h3>Task Not Found</h3>
        <p>The requested task ID is invalid or does not exist.</p>
        <div style="margin-top: 1.5rem;">
          <a href="task-list.html" style="display: inline-block; padding: 0.5rem 1rem; border: var(--border); background: var(--surface); color: var(--text); text-decoration: none; font-weight: bold; transition: all 0.2s ease;">
            Go to Task List
          </a>
        </div>
      </div>
    `;
    return;
  }

  renderDetail(task);
}

function renderDetail(task) {
  const detailContainer = document.getElementById("task-detail-container");
  if (!detailContainer) return;

  let priorityClass = "badge-low";
  if (task.priority === "High") priorityClass = "badge-high";
  else if (task.priority === "Medium") priorityClass = "badge-medium";

  const isCompleted = task.status === "Completed";
  const completeBtnLabel = isCompleted ? "Mark Pending" : "Mark Complete";
  const completeBtnBg = isCompleted ? "#ffc107" : "#28a745"; // Warning yellow vs Success green
  const completeBtnColor = isCompleted ? "#000000" : "#ffffff";

  detailContainer.innerHTML = `
    <h2 style="border-bottom: var(--border); padding-bottom: 0.5rem; margin-top: 0;">${escapeHTML(task.title)}</h2>
    <p style="margin-top: 1rem;">
      <strong>Due Date:</strong> ${formatDate(task.dueDate)} | 
      <strong>Priority:</strong> <span class="badge ${priorityClass}">${task.priority}</span> | 
      <strong>Status:</strong> <strong>${task.status}</strong>
    </p>
    <hr style="border: 1px solid var(--text); margin: 1.5rem 0;">
    <p style="white-space: pre-wrap; font-size: 1.1rem; line-height: 1.6; background: #fafafa; border: 1px dashed #ccc; padding: 1rem;">${escapeHTML(task.description || "No description provided.")}</p>
    
    <div style="margin-top: 2.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
      <button id="btn-complete" style="background: ${completeBtnBg}; color: ${completeBtnColor}; border: var(--border); font-weight: bold; cursor: pointer; text-transform: uppercase;">
        ${completeBtnLabel}
      </button>
      <button id="btn-delete" style="background: #dc3545; color: white; border: var(--border); font-weight: bold; cursor: pointer; text-transform: uppercase;">
        Delete Task
      </button>
    </div>
  `;

  // Attach button events
  const completeBtn = document.getElementById("btn-complete");
  if (completeBtn) {
    completeBtn.addEventListener("click", () => {
      const tasks = getTasks();
      const target = tasks.find(t => t.id === task.id);
      if (target) {
        target.status = target.status === "Completed" ? "Pending" : "Completed";
        saveTasks(tasks);
        updateNavbarBadge(); // Update navbar counter instantly
        renderDetail(target); // Re-render the detail container
      }
    });
  }

  const deleteBtn = document.getElementById("btn-delete");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
        const tasks = getTasks();
        const updatedTasks = tasks.filter(t => t.id !== task.id);
        saveTasks(updatedTasks);
        window.location.href = "task-list.html";
      }
    });
  }
}
