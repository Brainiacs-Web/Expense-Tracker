// Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  update,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"

const firebaseConfig = {
  apiKey: "AIzaSyDDw3o9KQicx7Q8hU27zllXVpW2RhrjQqQ",
  authDomain: "event-management-45d0f.firebaseapp.com",
  databaseURL: "https://event-management-45d0f-default-rtdb.firebaseio.com",
  projectId: "event-management-45d0f",
  storageBucket: "event-management-45d0f.firebasestorage.app",
  messagingSenderId: "471730841530",
  appId: "1:471730841530:web:862545afb335184f939f83",
  measurementId: "G-60J2BL41G6",
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

// Global state
let currentMonth = null

// Initialize app
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[v0] App initializing...")
  await loadCurrentMonth()
  await refreshAllData()
  setupEventListeners()
  console.log("[v0] App initialized successfully")
})

// Setup event listeners
function setupEventListeners() {
  document.getElementById("newMonthForm").addEventListener("submit", handleNewMonth)
  document.getElementById("expenseForm").addEventListener("submit", handleAddExpense)
  document.getElementById("quickExpenseForm").addEventListener("submit", handleQuickExpense)
  document.getElementById("loanForm").addEventListener("submit", handleAddLoan)
  document.getElementById("quickLoanForm").addEventListener("submit", handleQuickLoan)
  document.getElementById("savingsUsageForm").addEventListener("submit", handleUseSavings)
}

async function loadCurrentMonth() {
  try {
    console.log("[v0] Loading current month...")
    const monthsRef = ref(db, "months")
    const snapshot = await get(monthsRef)

    if (snapshot.exists()) {
      const monthsData = snapshot.val()
      const monthsArray = Object.entries(monthsData).map(([id, data]) => ({
        id,
        ...data,
      }))

      // Sort by startDate descending
      monthsArray.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))

      const now = new Date()
      for (const month of monthsArray) {
        const startDate = new Date(month.startDate)
        const endDate = new Date(month.endDate)

        if (now >= startDate && now <= endDate) {
          currentMonth = month
          console.log("[v0] Current month found:", currentMonth)
          break
        }
      }

      // If no active month found, use the most recent
      if (!currentMonth && monthsArray.length > 0) {
        currentMonth = monthsArray[0]
        console.log("[v0] No active month, using most recent:", currentMonth)
      }
    } else {
      console.log("[v0] No months found in database")
    }
  } catch (error) {
    console.error("[v0] Error loading current month:", error)
  }
}

// Refresh all data
async function refreshAllData() {
  updateHeaderStats()
  await loadRecentExpenses()
  await loadAllExpenses()
  await loadPendingLoans()
  await loadAllLoans()
  await loadHistory()
  await loadSavingsHistory()
  updateSettingsDisplay()
}

function updateHeaderStats() {
  if (!currentMonth) {
    document.getElementById("currentMonthPeriod").textContent = "No active month. Please start a new month."
    document.getElementById("totalReceived").textContent = "₹0"
    document.getElementById("totalSavings").textContent = "₹0"
    document.getElementById("totalSpent").textContent = "₹0"
    document.getElementById("availableBalance").textContent = "₹0"
    document.getElementById("savingsTotal").textContent = "₹0"
    return
  }

  const startDate = new Date(currentMonth.startDate)
  const endDate = new Date(currentMonth.endDate)
  const period = `${formatDate(startDate)} - ${formatDate(endDate)}`

  document.getElementById("currentMonthPeriod").textContent = period
  document.getElementById("totalReceived").textContent = `₹${currentMonth.amountReceived || 0}`
  document.getElementById("totalSavings").textContent = `₹${currentMonth.savings || 0}`
  document.getElementById("totalSpent").textContent = `₹${currentMonth.totalSpent || 0}`

  const available = (currentMonth.amountReceived || 0) - (currentMonth.savings || 0) - (currentMonth.totalSpent || 0)
  document.getElementById("availableBalance").textContent = `₹${available}`
  document.getElementById("savingsTotal").textContent = `₹${currentMonth.savings || 0}`
}

// Handle add expense
async function handleAddExpense(e) {
  e.preventDefault()
  await addExpense(
    document.getElementById("expenseReason").value,
    Number.parseFloat(document.getElementById("expenseAmount").value),
  )
  document.getElementById("expenseForm").reset()
}

async function handleQuickExpense(e) {
  e.preventDefault()
  await addExpense(
    document.getElementById("quickExpenseReason").value,
    Number.parseFloat(document.getElementById("quickExpenseAmount").value),
  )
  window.closeModal("expenseModal")
  document.getElementById("quickExpenseForm").reset()
}

async function addExpense(reason, amount) {
  if (!currentMonth) {
    alert("Please start a new month first!")
    return
  }

  try {
    const expenseData = {
      monthId: currentMonth.id,
      reason,
      amount,
      date: new Date().toISOString(),
    }

    const expensesRef = ref(db, "expenses")
    const newExpenseRef = push(expensesRef)
    await set(newExpenseRef, expenseData)

    // Update month total
    const newTotal = (currentMonth.totalSpent || 0) + amount
    const monthRef = ref(db, `months/${currentMonth.id}`)
    await update(monthRef, { totalSpent: newTotal })
    currentMonth.totalSpent = newTotal

    await refreshAllData()
    alert("Expense added successfully!")
  } catch (error) {
    console.error("[v0] Error adding expense:", error)
    alert("Failed to add expense. Please try again.")
  }
}

// Handle add loan
async function handleAddLoan(e) {
  e.preventDefault()
  await addLoan(
    document.getElementById("loanFriendName").value,
    Number.parseFloat(document.getElementById("loanAmount").value),
  )
  document.getElementById("loanForm").reset()
}

async function handleQuickLoan(e) {
  e.preventDefault()
  await addLoan(
    document.getElementById("quickLoanFriend").value,
    Number.parseFloat(document.getElementById("quickLoanAmount").value),
  )
  window.closeModal("loanModal")
  document.getElementById("quickLoanForm").reset()
}

async function addLoan(friendName, amount) {
  if (!currentMonth) {
    alert("Please start a new month first!")
    return
  }

  try {
    const loanData = {
      monthId: currentMonth.id,
      friendName,
      amount,
      returned: false,
      date: new Date().toISOString(),
    }

    const loansRef = ref(db, "loans")
    const newLoanRef = push(loansRef)
    await set(newLoanRef, loanData)

    // Deduct from total
    const newTotal = (currentMonth.totalSpent || 0) + amount
    const monthRef = ref(db, `months/${currentMonth.id}`)
    await update(monthRef, { totalSpent: newTotal })
    currentMonth.totalSpent = newTotal

    await refreshAllData()
    alert("Loan added successfully!")
  } catch (error) {
    console.error("[v0] Error adding loan:", error)
    alert("Failed to add loan. Please try again.")
  }
}

// Handle mark loan as returned with Realtime Database
async function markLoanReturned(loanId) {
  if (!confirm("Mark this loan as returned?")) return

  try {
    const loanRef = ref(db, `loans/${loanId}`)
    await update(loanRef, {
      returned: true,
      returnedDate: new Date().toISOString(),
    })

    // Fetch the loan data to get the amount
    const snapshot = await get(loanRef)
    const loanData = snapshot.val()
    const amount = loanData.amount

    // Add amount back to total
    const newTotal = (currentMonth.totalSpent || 0) - amount
    const monthRef = ref(db, `months/${currentMonth.id}`)
    await update(monthRef, { totalSpent: newTotal })
    currentMonth.totalSpent = newTotal

    await refreshAllData()
    alert("Loan marked as returned!")
  } catch (error) {
    console.error("[v0] Error updating loan:", error)
    alert("Failed to update loan. Please try again.")
  }
}

async function handleUseSavings(e) {
  e.preventDefault()

  if (!currentMonth) {
    alert("Please start a new month first!")
    return
  }

  const reason = document.getElementById("savingsReason").value
  const amount = Number.parseFloat(document.getElementById("savingsUsageAmount").value)

  if (amount > (currentMonth.savings || 0)) {
    alert("Insufficient savings!")
    return
  }

  try {
    const savingsUsageData = {
      monthId: currentMonth.id,
      reason,
      amount,
      date: new Date().toISOString(),
    }

    const savingsRef = ref(db, "savingsUsage")
    const newSavingsRef = push(savingsRef)
    await set(newSavingsRef, savingsUsageData)

    // Deduct from savings
    const newSavings = (currentMonth.savings || 0) - amount
    const monthRef = ref(db, `months/${currentMonth.id}`)
    await update(monthRef, { savings: newSavings })
    currentMonth.savings = newSavings

    window.closeModal("savingsModal")
    document.getElementById("savingsUsageForm").reset()
    await refreshAllData()
    alert("Savings used successfully!")
  } catch (error) {
    console.error("[v0] Error using savings:", error)
    alert("Failed to use savings. Please try again.")
  }
}

async function loadRecentExpenses() {
  if (!currentMonth) {
    document.getElementById("recentExpenses").innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No active month</p></div>'
    return
  }

  try {
    console.log("[v0] Loading recent expenses for month:", currentMonth.id)
    const expensesRef = ref(db, "expenses")
    const snapshot = await get(expensesRef)

    if (!snapshot.exists()) {
      document.getElementById("recentExpenses").innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No recent expenses</p></div>'
      return
    }

    const expensesData = snapshot.val()
    const expensesArray = Object.entries(expensesData)
      .map(([id, data]) => ({ id, ...data }))
      .filter((expense) => expense.monthId === currentMonth.id)

    // Filter last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentExpenses = expensesArray
      .filter((expense) => new Date(expense.date) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    if (recentExpenses.length === 0) {
      document.getElementById("recentExpenses").innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No recent expenses</p></div>'
      return
    }

    let html = ""
    recentExpenses.forEach((expense) => {
      html += createExpenseHTML(expense)
    })

    document.getElementById("recentExpenses").innerHTML = html
    console.log("[v0] Loaded", recentExpenses.length, "recent expenses")
  } catch (error) {
    console.error("[v0] Error loading recent expenses:", error)
  }
}

async function loadAllExpenses() {
  if (!currentMonth) {
    document.getElementById("allExpenses").innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No active month</p></div>'
    return
  }

  try {
    console.log("[v0] Loading all expenses for month:", currentMonth.id)
    const expensesRef = ref(db, "expenses")
    const snapshot = await get(expensesRef)

    if (!snapshot.exists()) {
      document.getElementById("allExpenses").innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No expenses yet</p></div>'
      return
    }

    const expensesData = snapshot.val()
    const expensesArray = Object.entries(expensesData)
      .map(([id, data]) => ({ id, ...data }))
      .filter((expense) => expense.monthId === currentMonth.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    if (expensesArray.length === 0) {
      document.getElementById("allExpenses").innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No expenses yet</p></div>'
      return
    }

    let html = ""
    expensesArray.forEach((expense) => {
      html += createExpenseHTML(expense)
    })

    document.getElementById("allExpenses").innerHTML = html
    console.log("[v0] Loaded", expensesArray.length, "expenses")
  } catch (error) {
    console.error("[v0] Error loading all expenses:", error)
  }
}

async function loadPendingLoans() {
  if (!currentMonth) {
    document.getElementById("pendingLoans").innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No active month</p></div>'
    return
  }

  try {
    const loansRef = ref(db, "loans")
    const snapshot = await get(loansRef)

    if (!snapshot.exists()) {
      document.getElementById("pendingLoans").innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">✅</div><p>No pending loans</p></div>'
      return
    }

    const loansData = snapshot.val()
    const loansArray = Object.entries(loansData)
      .map(([id, data]) => ({ id, ...data }))
      .filter((loan) => loan.monthId === currentMonth.id && !loan.returned)
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    if (loansArray.length === 0) {
      document.getElementById("pendingLoans").innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">✅</div><p>No pending loans</p></div>'
      return
    }

    let html = ""
    loansArray.forEach((loan) => {
      html += createLoanHTML(loan)
    })

    document.getElementById("pendingLoans").innerHTML = html
  } catch (error) {
    console.error("[v0] Error loading pending loans:", error)
  }
}

async function loadAllLoans() {
  if (!currentMonth) {
    document.getElementById("allLoans").innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No active month</p></div>'
    return
  }

  try {
    const loansRef = ref(db, "loans")
    const snapshot = await get(loansRef)

    if (!snapshot.exists()) {
      document.getElementById("allLoans").innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No loans yet</p></div>'
      return
    }

    const loansData = snapshot.val()
    const loansArray = Object.entries(loansData)
      .map(([id, data]) => ({ id, ...data }))
      .filter((loan) => loan.monthId === currentMonth.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    if (loansArray.length === 0) {
      document.getElementById("allLoans").innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No loans yet</p></div>'
      return
    }

    let html = ""
    loansArray.forEach((loan) => {
      html += createLoanHTML(loan)
    })

    document.getElementById("allLoans").innerHTML = html
  } catch (error) {
    console.error("[v0] Error loading all loans:", error)
  }
}

async function loadHistory() {
  try {
    const monthsRef = ref(db, "months")
    const snapshot = await get(monthsRef)

    if (!snapshot.exists()) {
      document.getElementById("historyList").innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No history yet</p></div>'
      return
    }

    const monthsData = snapshot.val()
    const monthsArray = Object.entries(monthsData)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))

    let html = ""
    for (const month of monthsArray) {
      // Skip current month
      if (currentMonth && month.id === currentMonth.id) continue

      html += await createHistoryMonthHTML(month)
    }

    if (!html) {
      document.getElementById("historyList").innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No previous months</p></div>'
      return
    }

    document.getElementById("historyList").innerHTML = html
  } catch (error) {
    console.error("[v0] Error loading history:", error)
  }
}

async function loadSavingsHistory() {
  if (!currentMonth) {
    document.getElementById("savingsHistory").innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No active month</p></div>'
    return
  }

  try {
    const savingsRef = ref(db, "savingsUsage")
    const snapshot = await get(savingsRef)

    if (!snapshot.exists()) {
      document.getElementById("savingsHistory").innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">💰</div><p>No savings usage yet</p></div>'
      return
    }

    const savingsData = snapshot.val()
    const savingsArray = Object.entries(savingsData)
      .map(([id, data]) => ({ id, ...data }))
      .filter((usage) => usage.monthId === currentMonth.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    if (savingsArray.length === 0) {
      document.getElementById("savingsHistory").innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">💰</div><p>No savings usage yet</p></div>'
      return
    }

    let html = ""
    savingsArray.forEach((usage) => {
      html += `
        <div class="transaction-item income">
          <div class="transaction-icon">💰</div>
          <div class="transaction-details">
            <div class="transaction-title">${usage.reason}</div>
            <div class="transaction-date">${formatDate(new Date(usage.date))}</div>
          </div>
          <div class="transaction-amount">-₹${usage.amount}</div>
        </div>
      `
    })

    document.getElementById("savingsHistory").innerHTML = html
  } catch (error) {
    console.error("[v0] Error loading savings history:", error)
  }
}

// Update settings display
function updateSettingsDisplay() {
  if (!currentMonth) {
    document.getElementById("currentStartDate").value = ""
    document.getElementById("currentEndDate").value = ""
    return
  }

  const startDate = new Date(currentMonth.startDate)
  const endDate = new Date(currentMonth.endDate)

  document.getElementById("currentStartDate").value = formatDateForInput(startDate)
  document.getElementById("currentEndDate").value = formatDateForInput(endDate)
}

// HTML creators
function createExpenseHTML(expense) {
  return `
    <div class="transaction-item">
      <div class="transaction-icon">₹</div>
      <div class="transaction-details">
        <div class="transaction-title">${expense.reason}</div>
        <div class="transaction-date">${formatDate(new Date(expense.date))}</div>
      </div>
      <div class="transaction-amount">-₹${expense.amount}</div>
    </div>
  `
}

function createLoanHTML(loan) {
  const statusClass = loan.returned ? "returned" : "pending"
  const statusText = loan.returned ? "Returned" : "Pending"

  return `
    <div class="transaction-item loan">
      <div class="transaction-icon">👤</div>
      <div class="transaction-details">
        <div class="transaction-title">${loan.friendName}</div>
        <div class="transaction-date">${formatDate(new Date(loan.date))}</div>
        ${
          !loan.returned
            ? `
          <div class="loan-actions">
            <button class="btn btn-sm btn-primary" onclick="markLoanReturned('${loan.id}')">
              Mark as Returned
            </button>
          </div>
        `
            : '<div style="color: var(--color-accent); font-size: 12px; margin-top: 4px;">✓ Returned</div>'
        }
      </div>
      <div class="transaction-amount">${loan.returned ? "+" : ""}₹${loan.amount}</div>
    </div>
  `
}

async function createHistoryMonthHTML(month) {
  const startDate = new Date(month.startDate)
  const endDate = new Date(month.endDate)
  const period = `${formatDate(startDate)} - ${formatDate(endDate)}`

  return `
    <div class="history-card">
      <div class="history-period">${period}</div>
      <div class="history-stats">
        <div class="history-stat-item">
          <div class="history-stat-label">Received</div>
          <div class="history-stat-value" style="color: var(--color-accent);">₹${month.amountReceived || 0}</div>
        </div>
        <div class="history-stat-item">
          <div class="history-stat-label">Savings</div>
          <div class="history-stat-value" style="color: var(--color-warning);">₹${month.savings || 0}</div>
        </div>
        <div class="history-stat-item">
          <div class="history-stat-label">Spent</div>
          <div class="history-stat-value" style="color: var(--color-danger);">₹${month.totalSpent || 0}</div>
        </div>
        <div class="history-stat-item">
          <div class="history-stat-label">Balance</div>
          <div class="history-stat-value">₹${(month.amountReceived || 0) - (month.savings || 0) - (month.totalSpent || 0)}</div>
        </div>
      </div>
    </div>
  `
}

// Utility functions
function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

function formatDateForInput(date) {
  return date.toISOString().split("T")[0]
}

// UI functions
window.switchTab = (tabName) => {
  // Remove active class from all tabs
  document.querySelectorAll(".nav-tab").forEach((tab) => tab.classList.remove("active"))
  document.querySelectorAll(".content-section").forEach((section) => section.classList.remove("active"))

  // Add active class to selected tab
  event.target.classList.add("active")
  document.getElementById(tabName).classList.add("active")
}

window.showModal = (modalId) => {
  document.getElementById(modalId).classList.add("active")
}

window.closeModal = (modalId) => {
  document.getElementById(modalId).classList.remove("active")
}

window.toggleSavingsInput = () => {
  const checkbox = document.getElementById("newMonthSaveCheck")
  const inputGroup = document.getElementById("savingsAmountGroup")
  inputGroup.style.display = checkbox.checked ? "block" : "none"
}

window.markLoanReturned = markLoanReturned

// Handle new month
async function handleNewMonth(e) {
  e.preventDefault()
  const startDate = document.getElementById("newMonthStartDate").value
  const endDate = document.getElementById("newMonthEndDate").value
  const amountReceived = Number.parseFloat(document.getElementById("newMonthAmountReceived").value)
  const savings = document.getElementById("newMonthSaveCheck").checked
    ? Number.parseFloat(document.getElementById("newMonthSavingsAmount").value)
    : 0

  try {
    const monthData = {
      startDate,
      endDate,
      amountReceived,
      savings,
      totalSpent: 0,
    }

    const monthsRef = ref(db, "months")
    const newMonthRef = push(monthsRef)
    await set(newMonthRef, monthData)

    currentMonth = { id: newMonthRef.key, ...monthData }
    await refreshAllData()
    alert("New month started successfully!")
  } catch (error) {
    console.error("[v0] Error starting new month:", error)
    alert("Failed to start new month. Please try again.")
  }
}
