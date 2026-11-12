
const API = "https://api.jolpi.ca/ergast/f1";

const initialPosts = [
  {
    id: 1,
    user: "Grid Racing",
    handle: "@gridracing",
    avatar: "🏎️",
    text: "🏁 Qual equipe vai dominar a próxima corrida? Vamos discutir!",
    likes: 248,
    comments: 36,
    liked: false,
    time: "5 min"
  },
  {
    id: 2,
    user: "F1 Community",
    handle: "@f1community",
    avatar: "🏁",
    text: "Qual é o circuito mais emocionante da Fórmula 1? Deixe sua opinião!",
    likes: 125,
    comments: 19,
    liked: false,
    time: "20 min"
  }
];

let posts = loadPosts();
let raceData = [];

function loadPosts() {
  try {
    return JSON.parse(localStorage.getItem("gridPosts")) || initialPosts;
  } catch {
    return initialPosts;
  }
}

function savePosts() {
  localStorage.setItem("gridPosts", JSON.stringify(posts));
}

function navigate(page) {
  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active", section.id === page);
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.page));
});

// FEED

function renderPosts() {
  const container = document.getElementById("posts");

  container.innerHTML = posts.map(post => `
    <article class="post">
      <div class="post-header">
        <div class="post-avatar">${escapeHTML(post.avatar)}</div>

        <div class="post-user">
          <strong>${escapeHTML(post.user)}</strong>
          <small>${escapeHTML(post.handle)} · ${escapeHTML(post.time)}</small>
        </div>
      </div>

      <p class="post-text">${escapeHTML(post.text).replace(/\n/g, "<br>")}</p>

      <div class="post-actions">
        <button class="${post.liked ? "liked" : ""}"
          onclick="toggleLike(${post.id})">
          <i data-lucide="heart"></i>
          ${post.likes}
        </button>

        <button onclick="showToast('Comentários serão adicionados na próxima etapa.')">
          <i data-lucide="message-circle"></i>
          ${post.comments}
        </button>

        <button onclick="sharePost(${post.id})">
          <i data-lucide="share-2"></i>
          Compartilhar
        </button>
      </div>
    </article>
  `).join("");

  lucide.createIcons();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

document.getElementById("postForm").addEventListener("submit", event => {
  event.preventDefault();

  const input = document.getElementById("postText");
  const text = input.value.trim();

  if (!text) return;

  posts.unshift({
    id: Date.now(),
    user: "Meu Perfil",
    handle: "@meuperfil",
    avatar: "🏎️",
    text,
    likes: 0,
    comments: 0,
    liked: false,
    time: "agora"
  });

  input.value = "";
  savePosts();
  renderPosts();
  navigate("feed");
  showToast("Publicação criada!");
});

function toggleLike(id) {
  posts = posts.map(post => {
    if (post.id !== id) return post;

    return {
      ...post,
      liked: !post.liked,
      likes: post.likes + (post.liked ? -1 : 1)
    };
  });

  savePosts();
  renderPosts();
}

async function sharePost(id) {
  const post = posts.find(item => item.id === id);
  if (!post) return;

  const content = `${post.user}: ${post.text}`;

  try {
    if (navigator.share) {
      await navigator.share({ text: content });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(content);
      showToast("Publicação copiada!");
    } else {
      showToast("Compartilhamento não disponível neste navegador.");
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      showToast("Não foi possível compartilhar.");
    }
  }
}

// CAMPEONATOS E CALENDÁRIO

async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Falha ao consultar a API.");
  }

  return response.json();
}

async function loadChampionship() {
  try {
    const [driverResult, teamResult, raceResult] = await Promise.all([
      fetchJSON(`${API}/current/driverStandings.json`),
      fetchJSON(`${API}/current/constructorStandings.json`),
      fetchJSON(`${API}/current.json`)
    ]);

    const driverStandings =
      driverResult.MRData.StandingsTable.StandingsLists[0]
        ?.DriverStandings || [];

    const teamStandings =
      teamResult.MRData.StandingsTable.StandingsLists[0]
        ?.ConstructorStandings || [];

    raceData = raceResult.MRData.RaceTable.Races || [];

    renderDrivers(driverStandings);
    renderTeams(teamStandings);
    renderRaces(raceData);
    renderNextRace(raceData);

  } catch (error) {
    console.error(error);

    document.getElementById("driversTable").innerHTML =
      `<tr><td colspan="5">Não foi possível carregar a classificação.</td></tr>`;

    document.getElementById("teamsTable").innerHTML =
      `<tr><td colspan="4">Não foi possível carregar a classificação.</td></tr>`;

    document.getElementById("raceGrid").innerHTML =
      `<p>Calendário temporariamente indisponível.</p>`;

    document.getElementById("nextRaceName").textContent =
      "Dados indisponíveis";
  }
}

function renderDrivers(drivers) {
  document.getElementById("driversTable").innerHTML = drivers.map(driver => `
    <tr>
      <td><span class="position">${driver.position}</span></td>
      <td><strong>${escapeHTML(driver.Driver.givenName)} ${escapeHTML(driver.Driver.familyName)}</strong></td>
      <td>${escapeHTML(driver.Constructors?.[0]?.name || "—")}</td>
      <td>${driver.wins}</td>
      <td><strong class="points">${driver.points}</strong></td>
    </tr>
  `).join("");
}

function renderTeams(teams) {
  document.getElementById("teamsTable").innerHTML = teams.map(team => `
    <tr>
      <td><span class="position">${team.position}</span></td>
      <td><strong>${escapeHTML(team.Constructor.name)}</strong></td>
      <td>${team.wins}</td>
      <td><strong class="points">${team.points}</strong></td>
    </tr>
  `).join("");
}

function renderRaces(races) {
  const container = document.getElementById("raceGrid");

  container.innerHTML = races.map(race => {
    const date = new Date(race.date + "T12:00:00");

    const formatted = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });

    const completed = race.Results && race.Results.length > 0;

    return `
      <article class="race-card">
        <div class="race-top">
          <span>ETAPA ${escapeHTML(race.round)}</span>
          <span>${completed ? "FINALIZADO" : "PROGRAMADO"}</span>
        </div>

        <h3>${escapeHTML(race.raceName)}</h3>

        <p>📍 ${escapeHTML(race.Circuit.circuitName)}</p>
        <p>🌎 ${escapeHTML(race.Circuit.Location.locality)}, ${escapeHTML(race.Circuit.Location.country)}</p>

        <div class="race-date">📅 ${formatted}</div>

        ${race.time ? `<small>Horário UTC: ${escapeHTML(race.time)}</small>` : ""}

        <a href="${escapeHTML(race.url)}" target="_blank" rel="noopener noreferrer">
          Detalhes do GP →
        </a>
      </article>
    `;
  }).join("");
}

function renderNextRace(races) {
  const now = new Date();

  const next = races.find(race => {
    return new Date(race.date + "T" + (race.time || "23:59:59Z")) >= now;
  });

  if (!next) {
    document.getElementById("nextRaceName").textContent =
      "Temporada sem próximas etapas";
    return;
  }

  document.getElementById("nextRaceName").textContent = next.raceName;
  document.getElementById("nextRaceCircuit").textContent =
    next.Circuit.circuitName;

  document.getElementById("nextRaceDate").textContent =
    new Date(next.date + "T12:00:00").toLocaleDateString("pt-BR");
}

// PESQUISA

document.getElementById("searchInput").addEventListener("input", event => {
  const query = event.target.value.toLowerCase().trim();

  if (!query) {
    renderPosts();
    return;
  }

  const filtered = posts.filter(post =>
    `${post.user} ${post.handle} ${post.text}`
      .toLowerCase().includes(query)
  );

  document.getElementById("posts").innerHTML = filtered.map(post => `
    <article class="post">
      <strong>${escapeHTML(post.user)}</strong>
      <p>${escapeHTML(post.text)}</p>
    </article>
  `).join("") || "<p>Nenhuma publicação encontrada.</p>";

  navigate("feed");
});

// MENU MOBILE

document.getElementById("mobileMenu").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

// NOTIFICAÇÕES

document.getElementById("notificationBtn").addEventListener("click", () => {
  showToast("Você não possui notificações novas.");
});

// AVISOS

let toastTimer;

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// INICIALIZAÇÃO

renderPosts();
loadChampionship();
lucide.createIcons();
