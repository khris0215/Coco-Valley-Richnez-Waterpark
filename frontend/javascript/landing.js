document.addEventListener("DOMContentLoaded", () => {
	const header = document.querySelector(".mini-header");
	if (header) {
		// Shrink the header once the visitor scrolls away from the top of the page.
		const syncHeaderState = () => {
			if (window.scrollY > 32) {
				header.classList.add("is-compact");
			} else {
				header.classList.remove("is-compact");
			}
		};

		syncHeaderState();
		window.addEventListener("scroll", syncHeaderState, { passive: true });
	}

	const primaryLayer = document.getElementById("heroVideoPrimary");
	const secondaryLayer = document.getElementById("heroVideoSecondary");

	if (!primaryLayer || !secondaryLayer) {
		return;
	}

	const clips = [
		"assets/videos/clip1.mp4",
		"assets/videos/clip2.mp4",
		"assets/videos/clip3.mp4",
		"assets/videos/clip4.mp4",
		"assets/videos/clip5.mp4"
	].filter(Boolean);

	if (!clips.length) {
		return;
	}

	const videoLayers = {
		current: primaryLayer,
		next: secondaryLayer
	};

	const CROSSFADE_BUFFER = 1.5; // Seconds remaining before triggering the transition.
	const CROSSFADE_DURATION = 1000; // Milliseconds matching the CSS opacity transition.

	let clipIndex = 0;
	let preparedIndex = clips.length > 1 ? (clipIndex + 1) % clips.length : null;
	let isCrossfading = false;

	const configureLayer = (video) => {
		video.muted = true;
		video.playsInline = true;
		video.setAttribute("playsinline", "");
		video.preload = "auto";
	};

	[primaryLayer, secondaryLayer].forEach(configureLayer);

	const playVideo = (video) => {
		const playPromise = video.play();
		if (playPromise instanceof Promise) {
			playPromise.catch(() => {
				/* Autoplay may be blocked until the user interacts; ignore gracefully. */
			});
		}
	};

	const loadClip = (video, src) => {
		if (!src) {
			return;
		}
		video.src = src;
		video.load();
	};

	const primeNextLayer = () => {
		if (clips.length <= 1) {
			return;
		}
		preparedIndex = (clipIndex + 1) % clips.length;
		loadClip(videoLayers.next, clips[preparedIndex]);
		videoLayers.next.pause();
		videoLayers.next.currentTime = 0;
	};

	const finalizeSwap = (nextIndex) => {
		const outgoingLayer = videoLayers.current;

		outgoingLayer.pause();
		outgoingLayer.currentTime = 0;

		videoLayers.current = videoLayers.next;
		videoLayers.next = outgoingLayer;
		videoLayers.next.classList.remove("is-active");
		videoLayers.next.removeAttribute("loop");

		clipIndex = nextIndex;
		primeNextLayer();
		isCrossfading = false;
	};

	const beginCrossfade = () => {
		if (clips.length <= 1 || isCrossfading) {
			return;
		}

		isCrossfading = true;

		const nextIndex = (clipIndex + 1) % clips.length;
		if (preparedIndex !== nextIndex) {
			loadClip(videoLayers.next, clips[nextIndex]);
			preparedIndex = nextIndex;
		}

		const startTransition = () => {
			videoLayers.next.currentTime = 0;
			playVideo(videoLayers.next);
			videoLayers.next.classList.add("is-active");
			videoLayers.current.classList.remove("is-active");

			setTimeout(() => {
				finalizeSwap(nextIndex);
			}, CROSSFADE_DURATION);
		};

		if (videoLayers.next.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
			startTransition();
		} else {
			videoLayers.next.addEventListener("canplay", startTransition, { once: true });
		}
	};

	const handleTimeUpdate = (event) => {
		if (event.target !== videoLayers.current || isCrossfading) {
			return;
		}

		const active = event.target;
		if (!Number.isFinite(active.duration) || active.duration === 0) {
			return;
		}

		const remaining = active.duration - active.currentTime;
		if (remaining <= CROSSFADE_BUFFER) {
			beginCrossfade();
		}
	};

	const handleEnded = (event) => {
		if (event.target !== videoLayers.current) {
			return;
		}
		beginCrossfade();
	};

	[primaryLayer, secondaryLayer].forEach((video) => {
		video.addEventListener("timeupdate", handleTimeUpdate);
		video.addEventListener("ended", handleEnded);
	});

	if (clips.length === 1) {
		loadClip(videoLayers.current, clips[0]);
		videoLayers.current.loop = true;

		const startSingleClip = () => {
			videoLayers.current.removeEventListener("canplay", startSingleClip);
			playVideo(videoLayers.current);
		};

		if (videoLayers.current.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
			startSingleClip();
		} else {
			videoLayers.current.addEventListener("canplay", startSingleClip, { once: true });
		}

		videoLayers.next.classList.remove("is-active");
		return;
	}

	loadClip(videoLayers.current, clips[clipIndex]);

	const startPlayback = () => {
		videoLayers.current.removeEventListener("canplay", startPlayback);
		playVideo(videoLayers.current);
	};

	if (videoLayers.current.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
		startPlayback();
	} else {
		videoLayers.current.addEventListener("canplay", startPlayback, { once: true });
	}

	videoLayers.current.classList.add("is-active");
	primeNextLayer();
});
