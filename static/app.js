// BigQuery Release Notes App Client Logic
document.addEventListener("DOMContentLoaded", () => {
  // State
  let feedData = null;
  let activeFilter = "all";
  let searchQuery = "";
  let selectedUpdate = null; // { id, title, type, text, link }

  // DOM Elements
  const refreshBtn = document.getElementById("refresh-btn");
  const refreshIcon = document.getElementById("refresh-icon");
  const refreshSpinner = document.getElementById("refresh-spinner");
  const refreshLabel = document.getElementById("refresh-label");
  const lastUpdatedText = document.getElementById("last-updated-text");
  const feedContainer = document.getElementById("feed-container");
  const searchInput = document.getElementById("search-input");
  const clearSearchBtn = document.getElementById("clear-search-btn");
  const filterPills = document.getElementById("filter-pills");

  // Selection Banner
  const selectionBanner = document.getElementById("selection-banner");
  const selectedSummary = document.getElementById("selected-summary");
  const bannerTweetBtn = document.getElementById("banner-tweet-btn");
  const clearSelectionBtn = document.getElementById("clear-selection-btn");

  // Modal Elements
  const tweetModal = document.getElementById("tweet-modal");
  const tweetTextarea = document.getElementById("tweet-textarea");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const copyTweetBtn = document.getElementById("copy-tweet-btn");
  const copyBtnText = document.getElementById("copy-btn-text");
  const publishTweetBtn = document.getElementById("publish-tweet-btn");
  const charCounter = document.getElementById("char-counter");
  const includeLinkCheck = document.getElementById("include-link-check");

  // --- Feed Fetching ---
  async function loadFeed() {
    setLoadingState(true);
    try {
      const response = await fetch("/api/feed");
      const result = await response.json();

      if (result.success && result.data) {
        feedData = result.data;
        lastUpdatedText.textContent = `Updated: ${feedData.fetched_at}`;
        renderFeed();
      } else {
        showError(result.error || "Failed to load release notes feed.");
      }
    } catch (err) {
      showError(err.message || "Network error loading release notes.");
    } finally {
      setLoadingState(false);
    }
  }

  function setLoadingState(isLoading) {
    if (isLoading) {
      refreshBtn.disabled = true;
      refreshIcon.classList.add("hidden");
      refreshSpinner.classList.remove("hidden");
      refreshLabel.textContent = "Fetching...";
    } else {
      refreshBtn.disabled = false;
      refreshIcon.classList.remove("hidden");
      refreshSpinner.classList.add("hidden");
      refreshLabel.textContent = "Refresh Notes";
    }
  }

  function showError(msg) {
    feedContainer.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#f85149" stroke-width="2" style="margin-bottom:1rem;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p style="color:#f85149; font-weight:600; margin-bottom:0.5rem;">Error Loading Feed</p>
        <p style="font-size:0.875rem;">${escapeHtml(msg)}</p>
      </div>
    `;
  }

  // --- Rendering ---
  function renderFeed() {
    if (!feedData || !feedData.entries || feedData.entries.length === 0) {
      feedContainer.innerHTML = `
        <div class="empty-state">
          <p>No release notes found in the feed.</p>
        </div>
      `;
      return;
    }

    const filteredEntries = [];
    const query = searchQuery.trim().toLowerCase();

    feedData.entries.forEach((entry) => {
      const matchingItems = entry.items.filter((item) => {
        const matchesCategory =
          activeFilter === "all" ||
          item.type.toLowerCase() === activeFilter.toLowerCase();
        const matchesSearch =
          !query ||
          item.text.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query) ||
          entry.title.toLowerCase().includes(query);

        return matchesCategory && matchesSearch;
      });

      if (matchingItems.length > 0) {
        filteredEntries.push({
          ...entry,
          items: matchingItems,
        });
      }
    });

    if (filteredEntries.length === 0) {
      feedContainer.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#6e7681" stroke-width="2" style="margin-bottom:0.8rem;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p>No release updates match your filters.</p>
        </div>
      `;
      return;
    }

    let html = "";
    filteredEntries.forEach((entry) => {
      html += `
        <article class="date-group">
          <header class="date-header">
            <div class="date-title-group">
              <svg class="calendar-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <h2 class="date-title">${escapeHtml(entry.title)}</h2>
            </div>
            <a href="${escapeHtml(entry.link)}" target="_blank" rel="noopener noreferrer" class="date-link" title="Open in official Google documentation">
              Official doc
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </header>
          <div class="items-list">
            ${entry.items
              .map((item) => {
                const isSelected = selectedUpdate && selectedUpdate.id === item.id;
                const badgeClass = getBadgeClass(item.type);
                return `
                <div class="update-item ${isSelected ? "selected" : ""}" id="item-${item.id}" data-item-id="${item.id}">
                  <div class="item-topbar">
                    <span class="badge ${badgeClass}">${escapeHtml(item.type)}</span>
                    <div class="item-actions">
                      <button class="btn btn-item-tweet select-btn" 
                              data-id="${item.id}" 
                              data-title="${escapeHtml(entry.title)}" 
                              data-type="${escapeHtml(item.type)}" 
                              data-link="${escapeHtml(entry.link)}"
                              data-text="${escapeAttr(item.text)}">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        ${isSelected ? "Selected" : "Select & Tweet"}
                      </button>
                    </div>
                  </div>
                  <div class="item-content">
                    ${item.html}
                  </div>
                </div>
              `;
              })
              .join("")}
          </div>
        </article>
      `;
    });

    feedContainer.innerHTML = html;
    attachItemEventListeners();
  }

  function getBadgeClass(type) {
    switch (type.toLowerCase()) {
      case "feature":
        return "badge-feature";
      case "breaking":
        return "badge-breaking";
      case "change":
        return "badge-change";
      case "announcement":
        return "badge-announcement";
      default:
        return "badge-default";
    }
  }

  function attachItemEventListeners() {
    document.querySelectorAll(".select-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = btn.getAttribute("data-id");
        const title = btn.getAttribute("data-title");
        const type = btn.getAttribute("data-type");
        const link = btn.getAttribute("data-link");
        const text = btn.getAttribute("data-text");

        selectUpdate({ id, title, type, link, text });
      });
    });
  }

  // --- Selection & Tweet Modal ---
  function selectUpdate(item) {
    selectedUpdate = item;
    selectedSummary.textContent = `[${item.title}] ${item.type}: ${item.text.slice(0, 100)}...`;
    selectionBanner.classList.remove("hidden");

    // Re-render so selected class applies to the item card
    renderFeed();

    // Open modal directly when user clicks Select & Tweet
    openTweetModal();
  }

  function clearSelection() {
    selectedUpdate = null;
    selectionBanner.classList.add("hidden");
    renderFeed();
  }

  function openTweetModal() {
    if (!selectedUpdate) return;
    composeTweetText();
    tweetModal.classList.remove("hidden");
    tweetTextarea.focus();
    updateCharCounter();
  }

  function closeTweetModal() {
    tweetModal.classList.add("hidden");
  }

  function composeTweetText() {
    if (!selectedUpdate) return;
    const includeLink = includeLinkCheck.checked;
    const cleanSnippet = selectedUpdate.text.replace(/\s+/g, " ").trim();
    const prefix = `[BigQuery ${selectedUpdate.type}] `;
    const linkSuffix = includeLink && selectedUpdate.link ? `\n\n${selectedUpdate.link}` : "";

    // 280 max tweet length
    const maxSnippetLength = 280 - prefix.length - linkSuffix.length - 3;
    let snippet = cleanSnippet;
    if (snippet.length > maxSnippetLength) {
      snippet = snippet.slice(0, maxSnippetLength) + "...";
    }

    tweetTextarea.value = `${prefix}${snippet}${linkSuffix}`;
    updateCharCounter();
  }

  function updateCharCounter() {
    const len = tweetTextarea.value.length;
    const remaining = 280 - len;
    charCounter.textContent = `${remaining} chars left`;

    charCounter.classList.remove("warning", "exceeded");
    if (remaining < 0) {
      charCounter.classList.add("exceeded");
    } else if (remaining < 25) {
      charCounter.classList.add("warning");
    }
  }

  // --- Event Listeners ---
  refreshBtn.addEventListener("click", loadFeed);

  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.classList.toggle("hidden", searchQuery.length === 0);
    renderFeed();
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    clearSearchBtn.classList.add("hidden");
    renderFeed();
    searchInput.focus();
  });

  filterPills.querySelectorAll(".pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      filterPills.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      activeFilter = pill.getAttribute("data-filter");
      renderFeed();
    });
  });

  bannerTweetBtn.addEventListener("click", openTweetModal);
  clearSelectionBtn.addEventListener("click", clearSelection);

  closeModalBtn.addEventListener("click", closeTweetModal);
  tweetModal.addEventListener("click", (e) => {
    if (e.target === tweetModal) closeTweetModal();
  });

  includeLinkCheck.addEventListener("change", composeTweetText);
  tweetTextarea.addEventListener("input", updateCharCounter);

  // Copy tweet text
  copyTweetBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(tweetTextarea.value);
      copyBtnText.textContent = "Copied!";
      setTimeout(() => {
        copyBtnText.textContent = "Copy text";
      }, 2000);
    } catch {
      tweetTextarea.select();
      document.execCommand("copy");
      copyBtnText.textContent = "Copied!";
      setTimeout(() => {
        copyBtnText.textContent = "Copy text";
      }, 2000);
    }
  });

  // Launch Twitter / X Web Intent
  publishTweetBtn.addEventListener("click", () => {
    const text = encodeURIComponent(tweetTextarea.value);
    const tweetIntentUrl = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(tweetIntentUrl, "_blank", "width=600,height=450,noopener,noreferrer");
  });

  // Utility helpers
  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(str) {
    if (!str) return "";
    return str
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Initial load
  loadFeed();
});
