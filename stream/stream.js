// FAHHH Stream - Netflix-style Video Player and Content Management

class StreamManager {
    constructor() {
        this.defaultVideoBaseUrl = 'https://statute-modelling-wanted-stripes.trycloudflare.com';
        this.videoBaseUrl = this.defaultVideoBaseUrl;
        this.mediaConfigUrl = './media-config.json';
        this.mediaManifestUrl = './media-manifest.json';
        this.currentShow = null;
        this.currentSeason = null;
        this.currentEpisode = null;
        this.selectedSeason = null;
        this.videoPlayer = document.getElementById('main-video');
        this.videoOverlay = document.getElementById('video-player-overlay');
        this.videoPlayerContainer = document.querySelector('.video-player-container');
        this.seasonModal = document.getElementById('season-selector-modal');
        this.seasonList = document.getElementById('season-list');
        this.episodeList = document.getElementById('episode-list');
        this.subtitleTrack = document.getElementById('subtitle-track');
        this.progressContainer = document.querySelector('.progress-container');
        this.progressBar = document.querySelector('.progress-bar');
        this.progressFill = document.getElementById('progress-fill');
        this.progressThumb = document.getElementById('progress-thumb');
        this.progressPreview = document.getElementById('progress-preview');
        this.loadingOverlay = document.getElementById('video-loading-overlay');
        this.centerToggleBtn = document.getElementById('video-center-toggle');
        this.subtitleOverlay = document.getElementById('subtitle-overlay');
        this.subtitleOverlayText = null;
        this.customTextTrack = null;
        this.activeSubtitleTrack = null;
        this.subtitlesVisible = true;
        this.isScrubbing = false;
        this.videoLoadToken = 0;
        this.pendingVideoLoadToken = 0;
        this.supportedVideoFormats = ['mp4', 'webm', 'ogg', 'ogv', 'mkv', 'mov'];
        this.shows = {};
        if (this.subtitleOverlay) {
            this.subtitleOverlayText = document.createElement('div');
            this.subtitleOverlayText.className = 'subtitle-overlay-text';
            this.subtitleOverlay.appendChild(this.subtitleOverlayText);
        }
        if (this.seasonModal && this.videoPlayerContainer && this.seasonModal.parentElement !== this.videoPlayerContainer) {
            // Keep the selector inside the fullscreen subtree so it remains visible in fullscreen mode.
            this.videoPlayerContainer.appendChild(this.seasonModal);
        }
    }

    async init() {
        console.log('StreamManager initializing...');
        await this.loadMediaConfig();
        const manifestShows = await this.loadMediaManifest();
        this.shows = manifestShows || this.loadShowsData();
        this.setupEventListeners();
        this.loadContentRows();
        this.setupVideoPlayer();
        this.updateHeroSection();
    }

    async loadMediaConfig() {
        try {
            const response = await fetch(this.mediaConfigUrl, { cache: 'no-store' });
            if (!response.ok) return;
            const config = await response.json();
            if (config && typeof config.videoBaseUrl === 'string' && config.videoBaseUrl.trim()) {
                this.videoBaseUrl = config.videoBaseUrl.trim();
            }
        } catch (error) {
            console.warn('Unable to load media config, using default base URL.', error);
            this.videoBaseUrl = this.defaultVideoBaseUrl;
        }
    }

    async loadMediaManifest() {
        try {
            const response = await fetch(this.mediaManifestUrl, { cache: 'no-store' });
            if (!response.ok) return null;
            const manifest = await response.json();
            if (manifest && manifest.shows && typeof manifest.shows === 'object') {
                return manifest.shows;
            }
        } catch (error) {
            console.warn('Unable to load media manifest, using built-in show data.', error);
        }
        return null;
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchContent(e.target.value));
        }

        // Video player controls
        const closePlayerBtn = document.getElementById('close-player');
        if (closePlayerBtn) closePlayerBtn.addEventListener('click', () => this.closeVideoPlayer());
        
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        
        const volumeBtn = document.getElementById('volume-btn');
        if (volumeBtn) volumeBtn.addEventListener('click', () => this.toggleMute());
        
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        if (this.centerToggleBtn) {
            this.centerToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePlayPause();
                this.showVideoControls();
                this.syncCenterToggleState();
            });
        }
        const episodesBtn = document.getElementById('episodes-btn');
        if (episodesBtn) episodesBtn.addEventListener('click', () => {
            // Toggle the selector modal. If nothing is active yet, open a show picker.
            if (this.seasonModal && this.seasonModal.style.display === 'flex') {
                this.closeSeasonModal();
            } else if (this.currentShow) {
                this.showSeasonSelector(this.currentShow);
            } else {
                this.showShowPicker();
            }
        });
        const skipBackBtn = document.getElementById('skip-back-btn');
        if (skipBackBtn) skipBackBtn.addEventListener('click', () => this.skip(-10));
        const skipForwardBtn = document.getElementById('skip-forward-btn');
        if (skipForwardBtn) skipForwardBtn.addEventListener('click', () => this.skip(10));
        
        const subtitlesBtn = document.getElementById('subtitles-btn');
        if (subtitlesBtn) {
            subtitlesBtn.addEventListener('click', () => this.toggleSubtitles());
            subtitlesBtn.addEventListener('click', () => {
                requestAnimationFrame(() => this.syncSubtitlePresentation());
            });
        }

        // Progress bar
        this.setupProgressScrubbing();

        // Video events
        if (this.videoPlayer) {
            this.videoPlayer.addEventListener('click', () => {
                if (this.isTouchOrCoarsePointer()) {
                    this.showVideoControls();
                    this.syncCenterToggleState();
                    return;
                }
                this.togglePlayPause();
            });
            this.videoPlayer.addEventListener('timeupdate', () => this.updateProgress());
            this.videoPlayer.addEventListener('loadedmetadata', () => this.updateDuration());
            this.videoPlayer.addEventListener('timeupdate', () => this.renderSubtitles());
            this.videoPlayer.addEventListener('ended', () => this.onVideoEnded());
            this.videoPlayer.addEventListener('play', () => this.updatePlayPauseButton());
            this.videoPlayer.addEventListener('pause', () => this.updatePlayPauseButton());
            this.videoPlayer.addEventListener('pause', () => this.saveProgress());
            this.videoPlayer.addEventListener('canplay', () => this.hideVideoLoading());
            this.videoPlayer.addEventListener('playing', () => this.hideVideoLoading());
            this.videoPlayer.addEventListener('error', () => this.hideVideoLoading());
            this.videoPlayer.addEventListener('play', () => this.syncCenterToggleState());
            this.videoPlayer.addEventListener('pause', () => this.syncCenterToggleState());
        }

        // Modal events
        const closeModalBtn = document.getElementById('close-modal');
        if (closeModalBtn) closeModalBtn.addEventListener('click', () => this.closeSeasonModal());
        
        if (this.seasonModal) {
            this.seasonModal.addEventListener('click', (e) => {
                if (e.target === this.seasonModal) this.closeSeasonModal();
            });
        }

        // Content item clicks - now opens season selector
        document.addEventListener('click', (e) => {
            const contentItem = e.target.closest('.content-item');
            if (contentItem && !e.target.closest('.placeholder')) {
                const showId = contentItem.dataset.show;
                if (showId && this.shows[showId]) {
                    this.showSeasonSelector(showId);
                }
            }
        });

        // Play button in hero - directly play first episode
        const playBtn = document.querySelector('.play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                const button = e.target.closest('.play-btn');
                const showId = button.dataset.show;
                const season = button.dataset.season || '1';
                const episode = button.dataset.episode || '1';
                this.playContent(showId, season, episode);
            });
        }
    }

    loadShowsData() {
        // This would typically load from a JSON file or API
        // For now, we'll define the structure here
        return {
            invincible: {
                title: "Invincible",
                poster: "posters/invincible.jpg",
                heroImage: "posters/invincible-hero.jpg",
                year: "2021",
                genre: "Superhero",
                seasons: 4,
                description: "Mark Grayson is a normal teenager except for the fact that his father is the most powerful superhero on the planet.",
                episodes: {
                    "1": {
                        "1": { title: "IT'S ABOUT TIME", duration: "47:14", video: "videos/invincible/S1/Ep 1" },
                        "2": { title: "HERE GOES NOTHING", duration: "44:11", video: "videos/invincible/S1/Ep 2" },
                        "3": { title: "WHO YOU CALLING UGLY?", duration: "41:57", video: "videos/invincible/S1/Ep 3" },
                        "4": { title: "NEIL ARMSTRONG, EAT YOUR HEART OUT", duration: "44:48", video: "videos/invincible/S1/Ep 4" },
                        "5": { title: "THAT ACTUALLY HURT", duration: "46:18", video: "videos/invincible/S1/Ep 5" },
                        "6": { title: "YOU LOOK KINDA DEAD", duration: "44:51", video: "videos/invincible/S1/Ep 6" },
                    },
                    "4": {
                        "6": { title: "IT'S NOT THAT SIMPLE", duration: "47:08", video: "videos/invincible/S4/Ep 6" },
                    }
                }
            }
            // Add more shows here...
        };
    }

    resolveVideoUrl(path) {
        if (!path) return '';
        if (/^(?:https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
            return path;
        }

        const cleanedPath = path.replace(/^\/+/, '').replace(/^videos\//, '');
        const base = this.videoBaseUrl.replace(/\/+$/, '');
        try {
            return new URL(cleanedPath, `${base}/`).toString();
        } catch (error) {
            return `${base}/${cleanedPath}`;
        }
    }

    updateHeroSection() {
        const heroSection = document.querySelector('.hero-section');
        const heroShow = this.shows.invincible;
        if (!heroSection || !heroShow) return;
        heroSection.style.backgroundImage = `url('${heroShow.heroImage}')`;
    }

    loadContentRows() {
        // Load trending content
        this.loadTrendingContent();
        // Load continue watching (from localStorage)
        this.loadContinueWatching();
        // Load TV shows
        this.loadTVShows();
        // Load movies
        this.loadMovies();
    }

    loadTrendingContent() {
        const trendingContainer = document.getElementById('trending-now');
        // Add trending shows/movies
        const trendingShows = ['invincible']; // Add more show IDs

        trendingShows.forEach(showId => {
            if (this.shows[showId]) {
                const show = this.shows[showId];
                const item = this.createContentItem(showId, show);
                trendingContainer.appendChild(item);
            }
        });
    }

    loadContinueWatching() {
        const continueContainer = document.getElementById('continue-watching');
        // Load from localStorage
        const continueWatching = JSON.parse(localStorage.getItem('continueWatching') || '[]');

        continueWatching.forEach(item => {
            if (this.shows[item.showId]) {
                const show = this.shows[item.showId];
                const contentItem = this.createContentItem(item.showId, show, item.season, item.episode);
                contentItem.querySelector('h3').textContent = `${show.title} - S${item.season}E${item.episode}`;
                continueContainer.appendChild(contentItem);
            }
        });
    }

    loadTVShows() {
        const tvContainer = document.getElementById('tv-shows');
        if (!tvContainer) return;
        tvContainer.querySelectorAll('.content-item[data-show]').forEach((item) => {
            const showId = item.dataset.show;
            const show = this.shows[showId];
            if (!show) return;
            const poster = item.querySelector('img.content-poster');
            if (poster) poster.src = show.poster;
        });
    }

    loadMovies() {
        const moviesContainer = document.getElementById('movies');
        if (!moviesContainer) return;
    }

    createContentItem(showId, show, season = null, episode = null) {
        const item = document.createElement('div');
        item.className = 'content-item';
        item.dataset.show = showId;
        if (season) item.dataset.season = season;
        if (episode) item.dataset.episode = episode;

        item.innerHTML = `
            <img src="${show.poster}" alt="${show.title}" class="content-poster">
            <div class="content-overlay">
                <h3>${show.title}</h3>
                <p>${show.year} &middot; ${show.genre} &middot; ${show.seasons} Season${show.seasons > 1 ? 's' : ''}</p>
            </div>
        `;

        return item;
    }

    playContent(showId, season = '1', episode = '1') {
        const show = this.shows[showId];
        if (!show) {
            console.error('[DEBUG] playContent: show not found', showId);
            return;
        }
        const episodeData = show.episodes[season]?.[episode];
        if (!episodeData) {
            console.error('[DEBUG] playContent: episode not found', showId, season, episode);
            return;
        }
        this.currentShow = showId;
        this.currentSeason = season;
        this.currentEpisode = episode;
        const loadToken = ++this.videoLoadToken;
        this.pendingVideoLoadToken = loadToken;
        this.showVideoLoading();
        const resumeTime = this.getSavedPlaybackTime(showId, season, episode);
        let resumeApplied = false;
        // Update player info
        document.getElementById('player-title').textContent = show.title;
        document.getElementById('player-episode').textContent = `Season ${season} Episode ${episode} - ${episodeData.title}`;
        // Set video sources for multiple playback formats
        this.clearVideoSources();
        const videoSources = this.getVideoSources(episodeData.video);
        videoSources.forEach((sourceUrl) => {
            const sourceElement = document.createElement('source');
            sourceElement.src = sourceUrl;
            sourceElement.type = this.getMimeType(sourceUrl);
            this.videoPlayer.appendChild(sourceElement);
        });
        this.videoPlayer.load();
        this.videoPlayer.muted = false;
        this.videoPlayer.volume = 1.0;
        // Try to play on user gesture if needed
        const tryPlay = () => {
            if (loadToken !== this.videoLoadToken) return;
            this.videoPlayer.play().then(() => {
                console.log('[DEBUG] Video play() succeeded');
                this.updatePlayPauseButton();
                this.hideVideoLoading();
            }).catch((e) => {
                console.warn('[DEBUG] play() failed, waiting for user gesture', e);
                // Show a message or overlay if needed
            });
        };
        // Start playback immediately so the original click remains a valid user gesture.
        tryPlay();
        // Attach play to user gesture if autoplay fails
        this.videoPlayer.onloadedmetadata = () => {
            if (resumeApplied || !resumeTime || loadToken !== this.videoLoadToken) return;
            this.applyResumeTime(loadToken, resumeTime);
            resumeApplied = true;
        };
        this.videoPlayer.onseeked = () => {
            if (loadToken !== this.videoLoadToken) return;
            if (!resumeApplied && resumeTime) {
                this.applyResumeTime(loadToken, resumeTime);
                resumeApplied = true;
            }
            this.hideVideoLoading();
        };
        this.videoPlayer.oncanplay = () => {
            if (!resumeApplied && resumeTime) {
                this.applyResumeTime(loadToken, resumeTime);
                resumeApplied = true;
            }
            this.hideVideoLoading();
            tryPlay();
        };
        this.videoPlayer.onerror = (e) => {
            console.error('[DEBUG] Video error:', e, this.videoPlayer.error);
            this.hideVideoLoading();
        };
        // Also try to play on first user interaction if needed
        const playOnUserGesture = () => {
            tryPlay();
            window.removeEventListener('click', playOnUserGesture);
            window.removeEventListener('keydown', playOnUserGesture);
        };
        window.addEventListener('click', playOnUserGesture);
        window.addEventListener('keydown', playOnUserGesture);
        // Load subtitles
        this.loadSubtitles(showId, season, episode);
        this.syncSubtitlePresentation();
        // Show player
        this.videoOverlay.style.display = 'flex';
        this.showVideoControls();
        this.syncCenterToggleState();
        // Save to continue watching
        this.saveToContinueWatching(showId, season, episode);
    }

    clearVideoSources() {
        const sources = Array.from(this.videoPlayer.querySelectorAll('source'));
        sources.forEach((source) => source.remove());
        this.videoPlayer.removeAttribute('src');
    }

    getPlaybackProgressKey(showId, season, episode) {
        return `playbackProgress:${showId}:${season}:${episode}`;
    }

    getSavedPlaybackTime(showId, season, episode) {
        const raw = localStorage.getItem(this.getPlaybackProgressKey(showId, season, episode));
        const time = Number(raw);
        return Number.isFinite(time) && time > 0 ? time : 0;
    }

    applyResumeTime(loadToken, resumeTime) {
        if (!resumeTime || !this.videoPlayer || loadToken !== this.videoLoadToken) return;
        const duration = this.videoPlayer.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;
        const safeTime = Math.max(0, Math.min(resumeTime, Math.max(0, duration - 2)));
        this.videoPlayer.currentTime = safeTime;
    }

    showVideoLoading() {
        if (!this.loadingOverlay) return;
        this.loadingOverlay.classList.add('visible');
        this.loadingOverlay.setAttribute('aria-hidden', 'false');
    }

    hideVideoLoading() {
        if (this.pendingVideoLoadToken && this.pendingVideoLoadToken !== this.videoLoadToken) return;
        if (!this.loadingOverlay) return;
        this.loadingOverlay.classList.remove('visible');
        this.loadingOverlay.setAttribute('aria-hidden', 'true');
    }

    showVideoControls() {
        if (!this.videoPlayerContainer) return;
        this.videoPlayerContainer.classList.add('show-overlays');
        this.syncCenterToggleState();
        if (this.controlVisibilityTimer) {
            clearTimeout(this.controlVisibilityTimer);
        }
        this.controlVisibilityTimer = setTimeout(() => {
            this.hideVideoControls();
        }, 2500);
    }

    hideVideoControls(force = false) {
        if (!this.videoPlayerContainer) return;
        if (force && this.controlVisibilityTimer) {
            clearTimeout(this.controlVisibilityTimer);
        }
        this.videoPlayerContainer.classList.remove('show-overlays');
        this.syncCenterToggleState();
    }

    getVideoSources(videoPath) {
        const extension = this.getFileExtension(videoPath);
        const basePath = extension ? videoPath.slice(0, -(extension.length + 1)) : videoPath;
        const formats = extension ? [extension, ...this.supportedVideoFormats.filter((f) => f !== extension)] : [...this.supportedVideoFormats];
        return formats.map((format) => this.resolveVideoUrl(`${basePath}.${format}`));
    }

    getFileExtension(path) {
        const dotIndex = path.lastIndexOf('.');
        return dotIndex === -1 ? '' : path.slice(dotIndex + 1).toLowerCase();
    }

    getMimeType(path) {
        const extension = this.getFileExtension(path);
        const mimeTypes = {
            mp4: 'video/mp4',
            webm: 'video/webm',
            ogg: 'video/ogg',
            ogv: 'video/ogg',
            mkv: 'video/x-matroska',
            mov: 'video/quicktime'
        };
        return mimeTypes[extension] || 'video/mp4';
    }

    getEpisodeThumbnailSources(showId, seasonNum, episodeNum, episode = {}) {
        if (episode.thumbnail) {
            return [episode.thumbnail];
        }

        const basePath = `thumbnails/${showId}/S${seasonNum}/Ep ${episodeNum}`;
        return ['webp', 'jpg', 'jpeg', 'png'].map((format) => `${basePath}.${format}`);
    }

    async loadSubtitles(showId, season, episode) {
        this.clearSubtitles();
        const basePath = `subtitles/${showId}/S${season}/Ep ${episode}`;
        const candidates = [
            `${basePath}.vtt`,
            `${basePath}.srt`
        ];
        let found = false;
        for (const subtitleUrl of candidates) {
            try {
                const response = await fetch(subtitleUrl);
                if (!response.ok) {
                    console.warn('[DEBUG] Subtitle not found:', subtitleUrl);
                    continue;
                }
                if (subtitleUrl.endsWith('.vtt')) {
                    // Use the static <track> element, but render cues in our own overlay.
                    if (this.subtitleTrack) {
                        this.subtitleTrack.mode = 'hidden';
                        this.subtitleTrack.src = '';
                        this.subtitleTrack.src = subtitleUrl;
                        this.subtitleTrack.default = true;
                        this.subtitleTrack.addEventListener('load', () => {
                            if (this.subtitleTrack.track) {
                                this.subtitleTrack.track.mode = 'hidden';
                                this.bindSubtitleTrack(this.subtitleTrack.track);
                                this.renderSubtitles();
                            }
                        }, { once: true });
                        setTimeout(() => {
                            if (this.subtitleTrack.track) {
                                this.subtitleTrack.track.mode = 'hidden';
                                this.bindSubtitleTrack(this.subtitleTrack.track);
                                this.renderSubtitles();
                            }
                        }, 100);
                    }
                    found = true;
                } else {
                    const srtText = await response.text();
                    this.loadSrtSubtitles(srtText);
                    found = true;
                }
                console.log('[DEBUG] Loaded subtitles:', subtitleUrl);
                break;
            } catch (error) {
                console.error('[DEBUG] Subtitle load error:', subtitleUrl, error);
                continue;
            }
        }
        if (!found) {
            console.warn('[DEBUG] No subtitles found for', showId, season, episode);
        }
        // Fallback: try to fetch from OpenSubtitles API
        // await this.fetchSubtitlesFromAPI(showId, season, episode);
    }

    async fetchSubtitlesFromAPI(showId, season, episode) {
        // OpenSubtitles API integration
        // This is a simplified example - you'd need proper API keys and implementation
        try {
            const show = this.shows[showId];
            const searchQuery = `${show.title} S${season}E${episode}`;

            // This would make an API call to OpenSubtitles
            // const response = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(searchQuery)}&languages=en`, {
            //     headers: {
            //         'Api-Key': 'YOUR_API_KEY_HERE'
            //     }
            // });

            console.log(`Attempting to fetch subtitles for: ${searchQuery}`);
            // For now, we'll just log this
        } catch (error) {
            console.error('Failed to fetch subtitles from API:', error);
        }
    }

    clearSubtitles() {
        this.hideSubtitleOverlay();
        if (this.activeSubtitleTrack && this._subtitleCueHandler) {
            try {
                this.activeSubtitleTrack.removeEventListener('cuechange', this._subtitleCueHandler);
            } catch (ignore) {}
        }
        this.activeSubtitleTrack = null;
        if (this.customTextTrack) {
            const cues = this.customTextTrack.cues ? Array.from(this.customTextTrack.cues) : [];
            cues.forEach(cue => {
                try {
                    this.customTextTrack.removeCue(cue);
                } catch (ignore) {}
            });
            this.customTextTrack.mode = 'hidden';
            this.customTextTrack = null;
        }

        if (this.subtitleTrack) {
            try {
                this.subtitleTrack.src = '';
                if (this.subtitleTrack.track) this.subtitleTrack.track.mode = 'hidden';
            } catch (ignore) {}
        }
    }

    isMobileSubtitleEnvironment() {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
    }

    isAppFullscreenActive() {
        return !!this.videoPlayerContainer && this.videoPlayerContainer.classList.contains('mobile-app-fullscreen');
    }

    isFullscreenActive() {
        return !!document.fullscreenElement || this.isAppFullscreenActive();
    }

    syncSubtitlePresentation() {
        if (!this.subtitleTrack) return;
        const track = this.subtitleTrack.track;
        const mobileFullscreen = this.isMobileSubtitleEnvironment() && !!document.fullscreenElement && !this.isAppFullscreenActive();
        const shouldShow = !!this.subtitlesVisible;

        if (track) {
            track.mode = mobileFullscreen && shouldShow ? 'showing' : 'hidden';
        }

        if (this.subtitleOverlay) {
            const showOverlay = shouldShow && !mobileFullscreen;
            this.subtitleOverlay.classList.toggle('hidden', !showOverlay);
            this.subtitleOverlay.setAttribute('aria-hidden', showOverlay ? 'false' : 'true');
        }

        if (!shouldShow || (mobileFullscreen && track)) {
            this.hideSubtitleOverlay();
        }
    }

    loadSrtSubtitles(srtText) {
        // Remove all previous custom subtitle tracks
        const tracks = Array.from(this.videoPlayer.textTracks);
        tracks.forEach(t => {
            if (t.kind === 'subtitles' && t.label === 'English' && t !== this.subtitleTrack?.track) {
                t.mode = 'disabled';
            }
        });

        // Wait for video metadata to be loaded
        const addCues = () => {
            const track = this.videoPlayer.addTextTrack('subtitles', 'English', 'en');
            track.mode = 'hidden';
            this.customTextTrack = track;
            this.bindSubtitleTrack(track);
            const cues = this.parseSrt(srtText);
            cues.forEach(cue => {
                if (cue) {
                    try {
                        track.addCue(cue);
                        console.log('[DEBUG] Added cue:', cue.startTime, cue.endTime, cue.text);
                    } catch (e) {
                        console.warn('[DEBUG] Failed to add cue:', e);
                    }
                }
            });
        };
        if (this.videoPlayer.readyState >= 1) {
            addCues();
        } else {
            this.videoPlayer.addEventListener('loadedmetadata', addCues, { once: true });
        }
        this.renderSubtitles();
    }

    parseSrt(srtData) {
        const input = srtData.replace(/\r/g, '').trim();
        const blocks = input.split(/\n\n+/);

        return blocks.map(block => {
            const lines = block.split('\n');
            if (lines.length < 2) return null;

            const timeLineIndex = lines[0].includes('-->') ? 0 : 1;
            const timeParts = lines[timeLineIndex].split('-->');
            if (timeParts.length !== 2) return null;

            const start = this.srtTimeToSeconds(timeParts[0].trim());
            const end = this.srtTimeToSeconds(timeParts[1].trim());
            const text = lines.slice(timeLineIndex + 1).join('\n');

            return this.createCue(start, end, text);
        }).filter(Boolean);
    }

    srtTimeToSeconds(timeString) {
        const parts = timeString.replace(',', '.').split(':');
        if (parts.length !== 3) return 0;
        const hours = parseFloat(parts[0]);
        const minutes = parseFloat(parts[1]);
        const seconds = parseFloat(parts[2]);
        return hours * 3600 + minutes * 60 + seconds;
    }

    createCue(start, end, text) {
        if (typeof VTTCue === 'function') {
            return new VTTCue(start, end, text);
        }

        if (typeof TextTrackCue === 'function') {
            return new TextTrackCue(start, end, text);
        }

        return null;
    }

    closeVideoPlayer() {
        this.videoPlayer.pause();
        if (this.videoPlayerContainer) {
            this.videoPlayerContainer.classList.remove('mobile-app-fullscreen');
        }
        document.body.classList.remove('video-mobile-fullscreen');
        this.clearSubtitles();
        this.hideVideoLoading();
        this.videoOverlay.style.display = 'none';
        this.hideVideoControls(true);
        this.saveProgress();
    }

    togglePlayPause() {
        if (this.videoPlayer.paused) {
            this.videoPlayer.play();
        } else {
            this.videoPlayer.pause();
        }
    }

    bindSubtitleTrack(track) {
        if (!track) return;
        if (this.activeSubtitleTrack && this.activeSubtitleTrack !== track && this._subtitleCueHandler) {
            try {
                this.activeSubtitleTrack.removeEventListener('cuechange', this._subtitleCueHandler);
            } catch (ignore) {}
        }
        this.activeSubtitleTrack = track;
        this._subtitleCueHandler = () => this.renderSubtitles();
        track.addEventListener('cuechange', this._subtitleCueHandler);
    }

    renderSubtitles() {
        if (!this.subtitleOverlayText) return;
        if (!this.subtitlesVisible) {
            this.hideSubtitleOverlay();
            return;
        }

        const track = this.customTextTrack || (this.subtitleTrack && this.subtitleTrack.track) || this.activeSubtitleTrack;
        const activeCues = track && track.activeCues ? Array.from(track.activeCues) : [];

        if (!activeCues.length) {
            this.hideSubtitleOverlay();
            return;
        }

        this.subtitleOverlayText.textContent = activeCues
            .map((cue) => (cue && cue.text ? String(cue.text).replace(/<[^>]*>/g, '') : ''))
            .filter(Boolean)
            .join('\n');
        this.showSubtitleOverlay();
    }

    showSubtitleOverlay() {
        if (!this.subtitleOverlay) return;
        this.subtitleOverlay.classList.remove('hidden');
        this.subtitleOverlay.setAttribute('aria-hidden', 'false');
    }

    hideSubtitleOverlay() {
        if (!this.subtitleOverlay) return;
        this.subtitleOverlay.classList.add('hidden');
        this.subtitleOverlay.setAttribute('aria-hidden', 'true');
        if (this.subtitleOverlayText) this.subtitleOverlayText.textContent = '';
    }

    updatePlayPauseButton() {
        const btn = document.getElementById('play-pause-btn');
        if (!btn) return;
        const icon = btn.querySelector('i');
        if (!icon) return;
        icon.className = this.videoPlayer && !this.videoPlayer.paused ? 'fas fa-pause' : 'fas fa-play';
    }

    toggleMute() {
        const btn = document.getElementById('volume-btn');
        const icon = btn.querySelector('i');

        if (this.videoPlayer.muted) {
            this.videoPlayer.muted = false;
            icon.className = 'fas fa-volume-up';
        } else {
            this.videoPlayer.muted = true;
            icon.className = 'fas fa-volume-mute';
        }
    }

    setVolume(value) {
        this.videoPlayer.volume = value;
        const icon = document.querySelector('#volume-btn i');

        if (value == 0) {
            icon.className = 'fas fa-volume-mute';
        } else if (value < 0.5) {
            icon.className = 'fas fa-volume-down';
        } else {
            icon.className = 'fas fa-volume-up';
        }
    }

    toggleFullscreen() {
        // Fullscreen the video player container so overlays remain visible
        const elem = this.videoPlayerContainer || this.videoOverlay || this.videoPlayer;
        if (!document.fullscreenElement) {
            if (this.isTouchOrCoarsePointer() && this.videoPlayerContainer) {
                const entering = !this.videoPlayerContainer.classList.contains('mobile-app-fullscreen');
                this.videoPlayerContainer.classList.toggle('mobile-app-fullscreen', entering);
                document.body.classList.toggle('video-mobile-fullscreen', entering);
                if (entering) {
                    this.showVideoControls();
                } else {
                    this.hideVideoControls(true);
                }
                this.syncSubtitlePresentation();
                this.syncCenterToggleState();
                return;
            }
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            } else if (this.videoOverlay.requestFullscreen) {
                this.videoOverlay.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    isTouchOrCoarsePointer() {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches;
    }

    syncCenterToggleState() {
        if (!this.centerToggleBtn || !this.videoPlayer) return;
        const icon = this.centerToggleBtn.querySelector('i');
        const isPlaying = !this.videoPlayer.paused && !this.videoPlayer.ended;
        const isTouch = this.isTouchOrCoarsePointer();
        const showControls = !!this.videoPlayerContainer && this.videoPlayerContainer.classList.contains('show-overlays');
        this.centerToggleBtn.classList.toggle('visible', showControls);
        this.centerToggleBtn.classList.toggle('mobile', isTouch);
        this.centerToggleBtn.classList.toggle('playing', isPlaying);
        this.centerToggleBtn.setAttribute('aria-hidden', showControls ? 'false' : 'true');
        if (icon) {
            icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
        }
    }

    skip(seconds) {
        if (!this.videoPlayer || isNaN(this.videoPlayer.duration)) return;
        const target = Math.max(0, Math.min(this.videoPlayer.duration, this.videoPlayer.currentTime + seconds));
        this.videoPlayer.currentTime = target;
        this.showVideoControls();
    }

    toggleSubtitles() {
        const btn = document.getElementById('subtitles-btn');
        this.subtitlesVisible = !this.subtitlesVisible;
        if (!this.subtitlesVisible) {
            this.hideSubtitleOverlay();
            btn.style.opacity = '0.5';
        } else {
            btn.style.opacity = '1';
            this.renderSubtitles();
        }
    }

    setupProgressScrubbing() {
        if (!this.progressBar || !this.videoPlayer) return;

        const moveHandler = (e) => {
            if (!this.isScrubbing) return;
            this.updateScrubPreview(e, true, true);
        };

        const upHandler = (e) => {
            if (!this.isScrubbing) return;
            this.updateScrubPreview(e, true, true);
            this.isScrubbing = false;
            this.progressContainer?.classList.remove('dragging');
            document.body.style.userSelect = '';
            document.removeEventListener('pointermove', moveHandler);
            document.removeEventListener('pointerup', upHandler);
            document.removeEventListener('pointercancel', upHandler);
        };

        this.progressBar.addEventListener('pointerdown', (e) => {
            if (!this.videoPlayer || !isFinite(this.videoPlayer.duration) || this.videoPlayer.duration <= 0) return;
            this.isScrubbing = true;
            this.progressContainer?.classList.add('dragging');
            document.body.style.userSelect = 'none';
            this.updateScrubPreview(e, true, true);
            this.progressBar.setPointerCapture?.(e.pointerId);
            document.addEventListener('pointermove', moveHandler);
            document.addEventListener('pointerup', upHandler);
            document.addEventListener('pointercancel', upHandler);
        });

        this.progressBar.addEventListener('pointermove', (e) => {
            if (this.isScrubbing) return;
            this.updateScrubPreview(e, false, false);
        });

        this.progressBar.addEventListener('pointerleave', () => {
            if (!this.isScrubbing) this.hideScrubPreview();
        });

        this.progressBar.addEventListener('pointerenter', (e) => {
            if (!this.isScrubbing) this.updateScrubPreview(e, false, false);
        });
    }

    updateScrubPreview(e, commit = false, liveProgress = false) {
        if (!this.progressBar || !this.videoPlayer || !isFinite(this.videoPlayer.duration) || this.videoPlayer.duration <= 0) return;

        const rect = this.progressBar.getBoundingClientRect();
        const clientX = Math.max(rect.left, Math.min(e.clientX, rect.right));
        const percentage = ((clientX - rect.left) / rect.width) * 100;
        const clamped = Math.max(0, Math.min(100, percentage));
        const newTime = (clamped / 100) * this.videoPlayer.duration;
        const timeLabel = this.formatTime(newTime);

        if (commit || liveProgress) {
            if (this.progressFill) this.progressFill.style.width = `${clamped}%`;
            if (this.progressThumb) this.progressThumb.style.left = `${clamped}%`;
        }

        if (this.progressPreview) {
            this.progressPreview.textContent = timeLabel;
            this.progressPreview.style.left = `${clamped}%`;
        }

        if (this.progressContainer) {
            this.progressContainer.classList.add('hovering');
        }

        if (commit) {
            this.videoPlayer.currentTime = newTime;
            document.getElementById('current-time').textContent = timeLabel;
        }

        if (this.progressPreview) {
            this.progressPreview.style.opacity = '1';
            this.progressPreview.style.visibility = 'visible';
        }
    }

    hideScrubPreview() {
        if (this.progressContainer && !this.isScrubbing) {
            this.progressContainer.classList.remove('hovering');
        }

        if (this.progressPreview && !this.isScrubbing) {
            this.progressPreview.style.opacity = '0';
            this.progressPreview.style.visibility = 'hidden';
        }
    }

    seekToPosition(e) {
        this.updateScrubPreview(e, true, true);
    }

    updateProgress() {
        if (this.isScrubbing) return;
        const duration = this.videoPlayer.duration;
        if (!duration || !isFinite(duration)) return;
        const progress = (this.videoPlayer.currentTime / duration) * 100;
        if (this.progressFill) this.progressFill.style.width = `${progress}%`;
        if (this.progressThumb) this.progressThumb.style.left = `${progress}%`;
        if (this.progressPreview && this.progressContainer) {
            this.progressPreview.style.left = `${progress}%`;
        }
        document.getElementById('current-time').textContent = this.formatTime(this.videoPlayer.currentTime);
    }

    updateDuration() {
        document.getElementById('duration').textContent = this.formatTime(this.videoPlayer.duration);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    onVideoEnded() {
        // Auto-play next episode if available
        const show = this.shows[this.currentShow];
        const nextEpisode = parseInt(this.currentEpisode) + 1;
        const nextSeason = parseInt(this.currentSeason);

        if (show.episodes[this.currentSeason]?.[nextEpisode]) {
            this.playContent(this.currentShow, this.currentSeason, nextEpisode);
        } else if (show.episodes[nextSeason]?.['1']) {
            this.playContent(this.currentShow, nextSeason, '1');
        }
    }

    saveProgress() {
        // Save current progress to localStorage
        const currentTime = this.videoPlayer.currentTime || 0;
        const duration = this.videoPlayer.duration || 0;
        const shouldResume = duration > 0 && currentTime < Math.max(0, duration - 3);
        const progress = {
            showId: this.currentShow,
            season: this.currentSeason,
            episode: this.currentEpisode,
            time: currentTime,
            timestamp: Date.now()
        };

        let progressData = JSON.parse(localStorage.getItem('watchProgress') || '[]');
        progressData = progressData.filter(p => !(p.showId === this.currentShow && p.season === this.currentSeason && p.episode === this.currentEpisode));
        progressData.push(progress);

        localStorage.setItem('watchProgress', JSON.stringify(progressData));
        if (this.currentShow && this.currentSeason && this.currentEpisode) {
            const key = this.getPlaybackProgressKey(this.currentShow, this.currentSeason, this.currentEpisode);
            if (shouldResume) {
                localStorage.setItem(key, String(Math.max(0, currentTime)));
            } else {
                localStorage.removeItem(key);
            }
        }
    }

    saveToContinueWatching(showId, season, episode) {
        const continueWatching = JSON.parse(localStorage.getItem('continueWatching') || '[]');

        // Remove existing entry for this show
        const filtered = continueWatching.filter(item => item.showId !== showId);

        // Add to beginning
        filtered.unshift({
            showId,
            season,
            episode,
            timestamp: Date.now()
        });

        // Keep only last 10 items
        const recent = filtered.slice(0, 10);

        localStorage.setItem('continueWatching', JSON.stringify(recent));
    }

    showSeasonSelector(showId) {
        console.log('[DEBUG] showSeasonSelector called with:', showId);
        const previouslySelectedShow = this.currentShow;
        const previouslySelectedSeason = this.currentSeason;
        const previouslySelectedEpisode = this.currentEpisode;
        const show = this.shows[showId];
        if (!show) {
            console.error('[DEBUG] Show not found:', showId);
            return;
        }
        this.currentShow = showId;
        // Update modal title
        const modalTitle = document.getElementById('modal-show-title');
        if (modalTitle) {
            modalTitle.textContent = show.title;
        }
        // Default to the episode that is currently playing for this show, if any.
        const initialSeason = (previouslySelectedShow === showId && previouslySelectedSeason && show.episodes[previouslySelectedSeason])
            ? previouslySelectedSeason
            : '1';
        const initialEpisode = (previouslySelectedShow === showId && previouslySelectedSeason === initialSeason)
            ? previouslySelectedEpisode
            : null;
        if (previouslySelectedShow !== showId) {
            this.currentSeason = null;
            this.currentEpisode = null;
        }
        this.selectedSeason = initialSeason;
        // Populate seasons
        this.populateSeasons(show);
        this.populateEpisodes(show, initialSeason, initialEpisode);
        // Show modal with animation
        if (this.seasonModal) {
            // Ensure any closing class is removed
            this.seasonModal.classList.remove('closing');
            this.seasonModal.style.display = 'flex';
            // Force reflow then add open class to trigger animation
            // eslint-disable-next-line no-unused-expressions
            this.seasonModal.offsetHeight;
            this.seasonModal.classList.add('open');
            console.log('[DEBUG] Modal opened (animated)');
        }
    }

    showShowPicker() {
        const modalTitle = document.getElementById('modal-show-title');
        if (modalTitle) {
            modalTitle.textContent = 'Select a Show';
        }

        if (this.seasonList) {
            const showCards = Object.entries(this.shows).map(([showId, show]) => {
                return `
                    <button class="show-picker-card" data-show="${showId}">
                        <img src="${show.poster}" alt="${show.title}" class="show-picker-poster">
                        <div class="show-picker-meta">
                            <h3>${show.title}</h3>
                            <p>${show.year} &middot; ${show.genre}</p>
                        </div>
                    </button>
                `;
            }).join('');

            this.seasonList.innerHTML = `
                <h3>Pick a show</h3>
                <div class="show-picker-grid">
                    ${showCards}
                </div>
            `;

            this.seasonList.querySelectorAll('.show-picker-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const showId = e.currentTarget.dataset.show;
                    if (showId) {
                        this.showSeasonSelector(showId);
                    }
                });
            });
        }

        if (this.episodeList) {
            this.episodeList.innerHTML = '';
        }

        if (this.seasonModal) {
            this.seasonModal.classList.remove('closing');
            this.seasonModal.style.display = 'flex';
            // eslint-disable-next-line no-unused-expressions
            this.seasonModal.offsetHeight;
            this.seasonModal.classList.add('open');
        }
    }

    populateSeasons(show) {
        const activeSeason = this.selectedSeason || '1';
        const seasonButtons = Object.keys(show.episodes).map(seasonNum => {
            return `<button class="season-btn ${seasonNum === activeSeason ? 'active' : ''}" data-season="${seasonNum}">
                Season ${seasonNum}
            </button>`;
        }).join('');

        this.seasonList.innerHTML = `
            <h3>Select Season</h3>
            <div class="season-buttons">
                ${seasonButtons}
            </div>
        `;

        // Add event listeners to season buttons
        this.seasonList.querySelectorAll('.season-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const seasonNum = e.target.dataset.season;
                this.selectSeason(seasonNum);
            });
        });
    }

    selectSeason(seasonNum) {
        this.selectedSeason = seasonNum;
        const show = this.shows[this.currentShow];

        // Update active season button
        this.seasonList.querySelectorAll('.season-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.seasonList.querySelector(`[data-season="${seasonNum}"]`).classList.add('active');

        // Populate episodes for selected season
        const activeEpisode = this.currentSeason === seasonNum ? this.currentEpisode : null;
        this.populateEpisodes(show, seasonNum, activeEpisode);
    }

    populateEpisodes(show, seasonNum, activeEpisodeNum = null) {
        const episodes = show.episodes[seasonNum];
        if (!episodes) return;

        const episodeItems = Object.keys(episodes).map(episodeNum => {
            const episode = episodes[episodeNum];
            const isActiveEpisode = activeEpisodeNum && episodeNum === String(activeEpisodeNum);
            const thumbnailSources = this.getEpisodeThumbnailSources(this.currentShow, seasonNum, episodeNum, episode);
            const thumbnailSrc = thumbnailSources[0] || show.poster;
            const posterFallback = show.poster || '';
            const fallbackSources = thumbnailSources.slice(1).concat(posterFallback ? [posterFallback] : []);

            return `
                <div class="episode-item${isActiveEpisode ? ' active watching' : ''}" data-episode="${episodeNum}">
                    <div class="episode-card">
                        <img
                            class="episode-thumb"
                            src="${thumbnailSrc.replace(/"/g, '&quot;')}"
                            alt="${episode.title}"
                            data-fallbacks='${JSON.stringify(fallbackSources).replace(/'/g, "&apos;")}'
                            data-fallback="${posterFallback.replace(/"/g, '&quot;')}"
                            onerror="(function(img){try{var list=JSON.parse(img.dataset.fallbacks||'[]');var next=list.shift();img.dataset.fallbacks=JSON.stringify(list);if(next){img.src=next;}else if(img.dataset.fallback&&img.src!==img.dataset.fallback){img.src=img.dataset.fallback;}}catch(e){if(img.dataset.fallback&&img.src!==img.dataset.fallback){img.src=img.dataset.fallback;}}})(this)"
                        >
                        <div class="watch-badge">${isActiveEpisode ? 'WATCHING' : ''}</div>
                        <div class="episode-card-inner">
                            <div class="ep-title-row">
                                <span class="ep-order">${episodeNum}.</span>
                                <div class="ep-title">${episode.title}</div>
                            </div>
                            <div class="ep-sub">${episode.duration} &middot; ${episode.description || ''}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.episodeList.innerHTML = `
            <h3>Season ${seasonNum} Episodes</h3>
            <div class="episode-grid">
                ${episodeItems}
            </div>
        `;

        // Add event listeners to episode items
        this.episodeList.querySelectorAll('.episode-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const episodeNum = e.target.closest('.episode-item').dataset.episode;
                this.playContent(this.currentShow, seasonNum, episodeNum);
                this.closeSeasonModal();
            });
        });

        if (activeEpisodeNum) {
            this.scrollEpisodeIntoView(activeEpisodeNum);
        }
    }

    scrollEpisodeIntoView(episodeNum) {
        if (!this.seasonModal || !this.episodeList) return;

        const target = this.episodeList.querySelector(`.episode-item[data-episode="${episodeNum}"]`);
        if (!target) return;

        requestAnimationFrame(() => {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        });
    }

    closeSeasonModal() {
        if (!this.seasonModal) return;
        // Animate closing then hide
        this.seasonModal.classList.remove('open');
        this.seasonModal.classList.add('closing');
        // After animation, hide the modal and clean up classes
        const finishClose = () => {
            this.seasonModal.style.display = 'none';
            this.seasonModal.classList.remove('closing');
            this.seasonModal.removeEventListener('animationend', finishClose);
        };
        this.seasonModal.addEventListener('animationend', finishClose);
    }

    searchContent(query) {
        console.log('Searching for:', query);
        // TODO: Implement search functionality
        // Filter through shows and movies based on query
    }

    setupVideoPlayer() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.videoOverlay.style.display === 'flex') {
                switch(e.code) {
                    case 'Space':
                        e.preventDefault();
                        this.togglePlayPause();
                        break;
                    case 'KeyF':
                        e.preventDefault();
                        this.toggleFullscreen();
                        break;
                    case 'KeyM':
                        e.preventDefault();
                        this.toggleMute();
                        break;
                    case 'KeyC':
                        // 'C' toggles subtitles
                        e.preventDefault();
                        this.toggleSubtitles();
                        break;
                    case 'Escape':
                        this.closeVideoPlayer();
                        break;
                    case 'ArrowLeft':
                        // Left arrow -> rewind 10s (backward)
                        e.preventDefault();
                        this.skip(-10);
                        break;
                    case 'ArrowRight':
                        // Right arrow -> forward 10s
                        e.preventDefault();
                        this.skip(10);
                        break;
                }
            }
        });

        if (this.videoPlayerContainer) {
            this.videoPlayerContainer.addEventListener('mousemove', () => this.showVideoControls());
            this.videoPlayerContainer.addEventListener('mouseleave', () => this.hideVideoControls(true));
            this.videoPlayerContainer.addEventListener('touchstart', () => this.showVideoControls());

            // When entering/exiting fullscreen, ensure overlays are shown briefly
            document.addEventListener('fullscreenchange', () => {
                const fs = !!document.fullscreenElement;
                if (fs) {
                    // when entering fullscreen, show overlays
                    this.showVideoControls();
                } else {
                    // when exiting, hide overlays after short delay
                    this.hideVideoControls(true);
                }
                this.syncSubtitlePresentation();
                this.syncCenterToggleState();
            });
        }
    }
}

// Initialize the stream manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const streamManager = new StreamManager();
    streamManager.init();
});

// Framework for adding new shows/movies
function addShow(showData) {
    // This function can be called to add new shows programmatically
    // showData should follow the structure in loadShowsData()
    console.log('Adding new show:', showData.title);
    // Implementation would save to localStorage or send to server
}

function addMovie(movieData) {
    // Similar function for movies
    console.log('Adding new movie:', movieData.title);
}

