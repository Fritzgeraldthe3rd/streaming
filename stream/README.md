# FAHHH Stream - Netflix-Style Video Platform

A modern streaming platform built with HTML, CSS, and JavaScript that integrates with your existing FAHHH Games website.

## Features

- 🎬 Netflix-style UI with your gaming site's theme
- 🎥 Custom video player with subtitle support
- 🔍 Real-time search functionality
- 📱 Responsive design
- 💾 Continue watching and progress tracking
- 🌐 OpenSubtitles.org API integration for subtitles
- 📂 Easy framework for adding new content
- 📺 Season and episode selector modal
- 📁 Organized folder structure with seasons subfolders

## File Structure

```
stream/
├── index.html          # Main streaming page
├── stream.css          # Netflix-style CSS with gaming theme
├── stream.js           # Video player and content management
├── posters/            # Show/movie poster images
├── videos/             # Video files organized by show
│   └── [show-id]/
│       ├── S1/         # Season 1 folder
│       │   ├── Ep 1.mp4
│       │   ├── Ep 2.mp4
│       │   └── Ep 3.mp4
│       └── S2/         # Season 2 folder
│           ├── Ep 1.mp4
│           └── Ep 2.mp4
├── subtitles/          # Subtitle files (.vtt format)
│   └── [show-id]/
│       ├── S1/         # Season 1 subtitles
│       │   ├── Ep 1.vtt
│       │   └── Ep 2.vtt
│       └── S2/         # Season 2 subtitles
│           └── Ep 1.vtt
└── README.md           # This file
```

## Adding New Shows

### 1. Prepare Your Content

Create the following folder structure for each show:

```
videos/[show-id]/
├── S1/
│   ├── Ep 1.mp4
│   ├── Ep 2.mp4
│   └── Ep 3.mp4
└── S2/
    ├── Ep 1.mp4
    └── Ep 2.mp4

subtitles/[show-id]/
├── S1/
│   ├── Ep 1.vtt
│   ├── Ep 2.vtt
│   └── Ep 3.vtt
└── S2/
    ├── Ep 1.vtt
    └── Ep 2.vtt

posters/
├── [show-id].jpg          # Main poster
└── [show-id]-hero.jpg     # Hero banner image
```

### 2. Add Show Data

Edit the `loadShowsData()` function in `stream.js` to add your new show:

```javascript
return {
    // ... existing shows ...

    "your-show-id": {
        title: "Your Show Title",
        poster: "posters/your-show-id.jpg",
        heroImage: "posters/your-show-id-hero.jpg",
        year: "2023",
        genre: "Action",
        seasons: 2,
        description: "Your show description here...",
        episodes: {
            "1": {
                "1": {
                    title: "Episode 1 Title",
                    duration: "45:23",
                    video: "videos/your-show-id/S1/Ep 1.mp4"
                },
                "2": {
                    title: "Episode 2 Title",
                    duration: "44:15",
                    video: "videos/your-show-id/S1/Ep 2.mp4"
                }
                // Add more episodes...
            },
            "2": {
                "1": {
                    title: "Season 2 Episode 1",
                    duration: "46:12",
                    video: "videos/your-show-id/S2/Ep 1.mp4"
                }
                // Add more episodes...
            }
        }
    }
};
```

### 3. How It Works

When users click on a show poster, they'll see:
1. **Season Selector**: Buttons for each available season
2. **Episode Grid**: Episodes for the selected season in a clean grid layout
3. **Click to Play**: Clicking any episode starts playback immediately

The interface automatically organizes content by season and provides an intuitive browsing experience similar to Netflix.

## Adding Movies

Movies follow a similar structure but don't need seasons/episodes:

```javascript
// In loadShowsData() - though you'd probably want a separate movies object
"movie-id": {
    title: "Movie Title",
    poster: "posters/movie-id.jpg",
    heroImage: "posters/movie-id-hero.jpg",
    year: "2023",
    genre: "Action",
    duration: "2h 15m",
    description: "Movie description...",
    video: "videos/movies/movie-id.mp4"
}
```

## Subtitle Integration

### Automatic Subtitle Loading

The system automatically looks for subtitle files in the `subtitles/[show-id]/S[season]/` directory with the naming pattern `Ep [episode].vtt` or `Ep [episode].srt`.

### OpenSubtitles API Integration

If local subtitles aren't found, the system attempts to fetch them from OpenSubtitles.org. To enable this:

1. Get an API key from [OpenSubtitles](https://www.opensubtitles.com/)
2. Add your API key to the `fetchSubtitlesFromAPI()` function
3. The system will automatically search for and download matching subtitles

## Customization

### Styling

The CSS uses CSS variables from your main `style.css` file:
- `--black`: Main background
- `--light-blue`: Accent color
- `--white`: Text color
- `--light-gray`: Secondary text
- `--dark-blue`: Borders and secondary backgrounds

### Video Player Controls

Customize the video player by modifying the `.video-controls` section in `stream.css`.

### Keyboard Shortcuts

- **Space**: Play/Pause
- **F**: Fullscreen
- **M**: Mute
- **Escape**: Close player

## Usage

1. Place video files in the appropriate `videos/` subdirectories
2. Add poster images to `posters/`
3. Add subtitle files (optional) to `subtitles/`
4. Update the show data in `stream.js`
5. Open `stream/index.html` in your browser

## Browser Support

- Modern browsers with ES6+ support
- Video formats: MP4 (H.264)
- Subtitle format: WebVTT (.vtt)

## Future Enhancements

- User accounts and watchlists
- Multiple subtitle languages
- Video quality selection
- Offline viewing
- Social features
- Recommendations engine