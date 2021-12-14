(function() {
    const handleAudioPlayer = function (audioElementContainer) {
        const audioPlayerContainer = audioElementContainer.querySelector('.kg-audio-player-container');
        const playIconContainer = audioElementContainer.querySelector('.kg-audio-play-icon');
        const pauseIconContainer = audioElementContainer.querySelector('.kg-audio-pause-icon');
        const seekSlider = audioElementContainer.querySelector('.kg-audio-seek-slider');
        const playbackRateContainer = audioElementContainer.querySelector('.kg-audio-playback-rate');
        const muteIconContainer = audioElementContainer.querySelector('.kg-audio-mute-icon');
        const unmuteIconContainer = audioElementContainer.querySelector('.kg-audio-unmute-icon');
        const volumeSlider = audioElementContainer.querySelector('.kg-audio-volume-slider');
        const audio = audioElementContainer.querySelector('audio');
        const durationContainer = audioElementContainer.querySelector('.kg-audio-duration');
        const currentTimeContainer = audioElementContainer.querySelector('.kg-audio-current-time');
        let playbackRates = [{
            rate: 0.75,
            label: '0.7×'
        }, {
            rate: 1.0,
            label: '1×'
        }, {
            rate: 1.25,
            label: '1.2×'
        }, {
            rate: 1.75,
            label: '1.7×'
        }, {
            rate: 2.0,
            label: '2×'
        }];

        let raf = null;
        let currentPlaybackRateIdx = 1;

        const whilePlaying = () => {
            seekSlider.value = Math.floor(audio.currentTime);
            currentTimeContainer.textContent = calculateTime(seekSlider.value);
            audioPlayerContainer.style.setProperty('--seek-before-width', `${seekSlider.value / seekSlider.max * 100}%`);
            raf = requestAnimationFrame(whilePlaying);
        }

        const showRangeProgress = (rangeInput) => {
            if (rangeInput === seekSlider) {
                audioPlayerContainer.style.setProperty('--seek-before-width', rangeInput.value / rangeInput.max * 100 + '%');
            }
            else {
                audioPlayerContainer.style.setProperty('--volume-before-width', rangeInput.value / rangeInput.max * 100 + '%');
            }
        }

        const calculateTime = (secs) => {
            const minutes = Math.floor(secs / 60);
            const seconds = Math.floor(secs % 60);
            const returnedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
            return `${minutes}:${returnedSeconds}`;
        }

        const displayDuration = () => {
            durationContainer.textContent = calculateTime(audio.duration);
        }

        const setSliderMax = () => {
            seekSlider.max = Math.floor(audio.duration);
        }

        const displayBufferedAmount = () => {
            if (audio.buffered.length > 0) {
                const bufferedAmount = Math.floor(audio.buffered.end(audio.buffered.length - 1));
                audioPlayerContainer.style.setProperty('--buffered-width', `${(bufferedAmount / seekSlider.max) * 100}%`);
            }
        }

        if (audio.readyState > 0) {
            displayDuration();
            setSliderMax();
            displayBufferedAmount();
        } else {
            audio.addEventListener('loadedmetadata', () => {
                displayDuration();
                setSliderMax();
                displayBufferedAmount();
            });
        }

        playIconContainer.addEventListener('click', () => {
            playIconContainer.classList.add("kg-audio-hide");
            pauseIconContainer.classList.remove("kg-audio-hide");
            audio.play();
            requestAnimationFrame(whilePlaying);
        });

        pauseIconContainer.addEventListener('click', () => {
            pauseIconContainer.classList.add("kg-audio-hide");
            playIconContainer.classList.remove("kg-audio-hide");
            audio.pause();
            cancelAnimationFrame(raf);
        });

        muteIconContainer.addEventListener('click', () => {
            muteIconContainer.classList.add("kg-audio-hide");
            unmuteIconContainer.classList.remove("kg-audio-hide");
            audio.muted = false;
        });

        unmuteIconContainer.addEventListener('click', () => {
            unmuteIconContainer.classList.add("kg-audio-hide");
            muteIconContainer.classList.remove("kg-audio-hide");
            audio.muted = true;
        });

        playbackRateContainer.addEventListener('click', () => {
            let nextPlaybackRate = playbackRates[(currentPlaybackRateIdx + 1) % 5];
            currentPlaybackRateIdx = currentPlaybackRateIdx + 1;
            audio.playbackRate = nextPlaybackRate.rate;
            playbackRateContainer.textContent = nextPlaybackRate.label;
        });

        audio.addEventListener('progress', displayBufferedAmount);

        seekSlider.addEventListener('input', (e) => {
            showRangeProgress(e.target);
            currentTimeContainer.textContent = calculateTime(seekSlider.value);
            if (!audio.paused) {
                cancelAnimationFrame(raf);
            }
        });

        seekSlider.addEventListener('change', () => {
            audio.currentTime = seekSlider.value;
            if (!audio.paused) {
                requestAnimationFrame(whilePlaying);
            }
        });

        volumeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            showRangeProgress(e.target);
            audio.volume = value / 100;
        });
    }

    const audioCardElements = document.querySelectorAll('.kg-audio-card');

    for (let i = 0; i < audioCardElements.length; i++) {
        handleAudioPlayer(audioCardElements[i]);
    }
})();
