SUBTITLE FILES ORGANIZATION:

Place your subtitle files in this directory structure:

subtitles/
├── [show-id]/
│   ├── S1/
│   │   ├── Ep 1.srt    # Season 1, Episode 1 subtitles
│   │   ├── Ep 2.srt    # Season 1, Episode 2 subtitles
│   │   └── Ep 3.srt    # Season 1, Episode 3 subtitles
│   └── S2/
│       ├── Ep 1.srt    # Season 2, Episode 1 subtitles
│       └── Ep 2.srt    # Season 2, Episode 2 subtitles
└── movies/
    ├── movie1.vtt
    └── movie2.vtt

SUBTITLE REQUIREMENTS:
- Format: WebVTT (.vtt) - standard for HTML5 video
- Encoding: UTF-8
- Timing: Accurate timestamps matching video
- Language: English (en) by default
- Naming: Match video files - "Ep [number].vtt" or "Ep [number].srt" (e.g., Ep 1.vtt, Ep 1.srt)

SAMPLE VTT FORMAT:
WEBVTT

1
00:00:01.000 --> 00:00:05.000
[Opening theme music]

2
00:00:05.000 --> 00:00:08.000
Narrator: In a world where superheroes...

3
00:00:08.000 --> 00:00:12.000
...are the celebrities of today,

SOURCES:
- OpenSubtitles.org downloads
- Manual creation with subtitle editors
- Extracted from video files
- Professional subtitle services

AUTO-FETCH: If no local subtitle file exists, the system will attempt to fetch from OpenSubtitles.org API.