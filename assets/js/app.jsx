import ReactCSSTransitionGroup from "react-addons-css-transition-group"
import Fade from "react-reveal/Fade"
import getJSON from "get-json"
import storage from "electron-json-storage"
import uniqid from "uniqid"
import * as firebase from 'firebase/app'
import "firebase/auth"
import "firebase/database"

class App extends React.Component {
    constructor(props) {
        super(props);

        this.fetchAttempts = 0;

        this.state = {
            apiKey: "22b4015cb2245d35a9c1ad8cd48e314c",
            loginError: false,
            account: true,
            create: false,
            inputEmail: '',
            inputPass: '',
            user: false,
            isGuest: false,
            menu: [
                "Featured", "Movies", "Collection", "Sign In"
            ],
            active: "Featured",
            backupTorrents: false,
            suggested: [],
            recentlyPlayed: [],
            favorites: [],
            movieTimeArray: [],
            magnetArray: [],
            results: [],
            backupIsOpen: false,
            videoIndex: false,
            activeGenre: false,
            genreID: 0,
            showGenre: false,
            collectionContainer: false,
            menuActive: false,
            headerBg: false,
            content: false,
            showBox: false,
            movieCurrent: false,
            playMovie: false,
            playerLoading: true,
            paused: true,
            genreContainer: false,
            genrePages: 7,
            search: false,
            searchContent: false,
            isOffline: false,
            logoIsLoaded: false,
            error: false,
            appLoading: true,
            listWidth: false,
            time: "00:00:00"
        }
    }

    setListWidth = (listWidth) => {
        this.setState({listWidth});
    }

    toggleGenre = (showGenre, activeGenre, genreID) => {
        this.setState({showGenre, activeGenre, genreID});
    }

    closeGenre = () => {
        this.toggleGenre()
    }

    setUserCredentials = () => {
        storage.set("userCredentials", {
            user: this.state.user,
            create: this.state.create,
            account: this.state.account,
            isGuest: this.state.isGuest
        }, error => {
            if (error) {
                throw error;
            }
        });
    }

    getUserCredentials = () => {
        storage.get("userCredentials", (error, data) => {
            this.setState({
                user: data.user
                    ? data.user.uid
                        ? data.user
                        : false : false,
                create: data.create,
                account: data.account,
                isGuest: data.isGuest
            }, () => {
                this.startFireBase();
            });
        });
    }

    cleanMovieArrays = (array) => {
        if (array) {
            let clean = array.slice();
            for (let j = 0; j < array.length; j++) {
                let object = array[j];
                if (typeof object === 'object') {
                    this.removeEmpty(object);
                }
            }

            return clean;
        } else {
            return [];
        }
    }

    removeEmpty = (obj) => {
        Object
            .keys(obj)
            .forEach(key => {
                if (obj[key] && typeof obj[key] === 'object') 
                    this.removeEmpty(obj[key]);
                else if (obj[key] === undefined) 
                    delete obj[key];
                }
            );
        return obj;
    }

    createDataBase = () => {
        let db = firebase.database();
        this.databaseRef = db.ref(`users/${this.state.user.uid}`);
    }

    setBucket = () => {
        if (this.state.user.email) {
            let data = {
                recentlyPlayed: this.cleanMovieArrays(this.state.recentlyPlayed),
                movieTimeArray: this.cleanMovieArrays(this.state.movieTimeArray),
                favorites: this.cleanMovieArrays(this.state.favorites),
                suggested: this.cleanMovieArrays(this.state.suggested)
            };

            this
                .databaseRef
                .set(data, (err) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Data set!');
                    }
                });

        }
    }

    setBucketData = (snapshot) => {
        return new Promise((resolve, reject) => {
            let data = snapshot.val();
            if (data) {
                if (data.favorites !== this.state.favorites && data.recentlyPlayed !== this.state.recentlyPlayed && data.movieTimeArray !== this.state.movieTimeArray && data.suggested !== this.state.suggested) {
                    this.setState({
                        favorites: data.favorites,
                        recentlyPlayed: data.recentlyPlayed,
                        movieTimeArray: data.movieTimeArray,
                        suggested: data.suggested,
                        results: this.state.active == 'Collection'
                            ? [data.suggested[0]]
                            : this.state.results
                    }, () => resolve());
                }
            } else {
                reject();
            }
        });
    }

    listenToBucket = () => {
        if (this.databaseRef) {
            this
                .databaseRef
                .on('value', this.setBucketData);
        }
    }

    getBucket = () => {
        if (this.databaseRef) {
            this
                .databaseRef
                .once('value', (snapshot) => {
                    this
                        .setBucketData(snapshot)
                        .then(() => this.updateSuggested())
                        .catch((err) => console.log(err));
                });
        }
    }

    setStorage = () => {
        storage.set("collection", {
            favorites: this.state.favorites,
            recentlyPlayed: this.state.recentlyPlayed,
            movieTimeArray: this.state.movieTimeArray,
            suggested: this.state.suggested
        }, error => {
            if (error) {
                throw error;
            }
            if (firebase.auth().currentUser) {
                this.setBucket();
            }
        });
    }

    getStorage = () => {
        storage.get("collection", (error, data) => {

            this.setState({
                favorites: data
                    ? data.favorites
                        ? data.favorites
                        : []: [],
                recentlyPlayed: data
                    ? data.recentlyPlayed
                        ? data.recentlyPlayed
                        : []: [],
                movieTimeArray: data
                    ? data.movieTimeArray
                        ? data.movieTimeArray
                        : []: [],
                suggested: data
                    ? data.suggested
                        ? data.suggested
                        : []: []
            }, (error) => {
                setTimeout(() => {
                    this.setState({appLoading: false});
                }, 2500);
            });
        });
    }

    formatTime = (secondString) => {
        let sec_num = parseInt(secondString, 10);
        let hours = Math.floor(sec_num / 3600);
        let minutes = Math.floor((sec_num - hours * 3600) / 60);
        let seconds = sec_num - hours * 3600 - minutes * 60;

        if (hours < 10) {
            hours = `0${hours}`;
        }
        if (minutes < 10) {
            minutes = `0${minutes}`;
        }
        if (seconds < 10) {
            seconds = `0${seconds}`;
        }
        return `${hours
            ? hours + ":"
            : ""}${
        minutes
            ? minutes + ":"
            : ""}${seconds}`;
    }

    getPreferredTorrent = (torrents) => {
        return new Promise((resolve, reject) => {
            let preferredTorrents = torrents.filter((item, index) => {
                if (item) {
                    let title = item
                        .title
                        .toUpperCase();
                    return title.match(/^(?=.*(1080|720|HD|YIFY))(?!.*(HDTS|HDTC|HD\.TS|HD\.TC|HD\-TS|HD\-TC|CAM))/g);
                }
            });

            preferredTorrents.sort((a, b) => b.seeds - a.seeds);

            resolve(preferredTorrents);
        });

    }

    togglePause = (paused) => {
        this.setState({paused});
    }

    setPlayerTime = (time) => {
        this.setState({time});
    }

    handleVideo = () => {
        let video = document.querySelector("video");
        let seekBar = document.querySelector(".seek-bar");

        if (seekBar !== null) {
            if (video.duration) {
                let value = 100 / video.duration * video.currentTime;
                let time = this.formatTime(video.duration - video.currentTime);
                let colorStop = this.getElementValue(seekBar) / 100;

                this.setPlayerTime(time);
                this.setElementValue(seekBar, "value", value);

                this.setElementStyle(seekBar, "backgroundImage", "-webkit-gradient(linear, left top, right top, color-stop(" + colorStop + ", rgb(255, 0, 0)), color-stop(" + colorStop + ", rgba(255, 255, 255, 0.158)))");

                this.togglePause(video.paused);
            }
        }
    }

    handleVideoClose = (video) => {
        if (video.src) {
            this.updateMovieTime(video.currentTime);
        }
    }

    setMovieTime = (movie) => {
        let video = document.querySelector("video");
        let movieMatch = this
            .state
            .movieTimeArray
            .find(item => {
                return movie.id == item.id;
            });

        if (movieMatch) {
            if (movieMatch.currentTime) {
                video.currentTime = movieMatch.currentTime;
            }

            this.setState({recentlyPlayed: this.state.recentlyPlayed});
        }
    }

    openBackup = () => {
        this.setState({backupIsOpen: true});
    }

    showBackup = (simple) => {
        if (simple) {
            this.openBackup();
        } else {
            this.setVideoIndex();
            this.setVideoError(true);
            this.openBackup();
        }
    }

    applyTimeout = () => {
        if (this.server) {
            this
                .server
                .close();
        }
        this.showBackup();
        console.log('Streaming timed out.');
    }

    startWebTorrent = () => {
        let WebTorrent = require('webtorrent');
        this.setState({
            client: new WebTorrent()
        }, () => {
            this
                .state
                .client
                .on('error', (err) => {
                    console.log(err);
                });
        });
    }

    removeTorrent = (magnet) => {
        return new Promise((resolve, reject) => {
            this
                .state
                .client
                .remove(magnet, () => {
                    resolve('Torrent removed.');
                }, (err) => {
                    reject(err);
                });
        }).catch(err => console.log(err));
    }

    setVideoError = (error) => {
        this.setState({error});
    }

    streamTorrent = (movie) => {
        this.resetVideo();
        this.changeCurrentMagnet(movie.magnet);

        this.timeOut = setTimeout(() => {
            if (this.state.time == '00:00:00') {
                this.applyTimeout();
            }
        }, 80000);

        if (this.state.playMovie) {
            this
                .state
                .client
                .add(movie.magnet, torrent => {
                    console.log(`Attempting to stream "${movie.title}" from ${movie.magnet}.`);
                    let videoFormats = ["avi", "mp4", "mkv", "wmv", "mov"];
                    let filtered = torrent
                        .files
                        .filter((file) => {
                            let extension = file
                                .name
                                .substring(file.name.lastIndexOf(".") + 1, file.name.length);

                            if (videoFormats.indexOf(extension) > -1) {
                                return file;
                            }
                        });

                    filtered.sort((a, b) => {
                        return b.length - a.length;
                    });

                    let file = filtered[0];
                    let fileIndex = torrent
                        .files
                        .findIndex((item) => {
                            return file.path == item.path;
                        });

                    if (file && this.state.playMovie) {
                        this.server = torrent.createServer();
                        this
                            .server
                            .listen('8888');

                        this
                            .setVideoIndex(fileIndex)
                            .then(() => {
                                this.setMovieTime(this.state.playMovie);
                            });
                    } else if (!file) {
                        this.applyTimeout();
                    } else if (!this.state.playMovie) {
                        this.removeMagnet(movie.magnet);
                    }
                });
        } else {
            this.destroyClient();
        }
    }

    getSearch = () => {
        return document.querySelector(".search-bar-container input");
    }

    setElementValue = (elem, property, value) => {
        elem[property] = value;
    }

    setElementStyle = (elem, property, value) => {
        elem.style[property] = value;
    }

    getElementValue = (elem) => {
        return elem.value;
    }

    resetSearch = () => {
        this.setElementValue(this.getSearch(), "value", "");
        this.toggleSearch();
    }

    toggleContainerSettings = (genreContainer, collectionContainer) => {
        this.setState({genreContainer, collectionContainer});
    }

    toggleSearch = (open, content) => {
        this.setState({search: open, searchContent: content});
    }

    closeSearch = () => {
        this.resetSearch();
        this
            .getSearch()
            .focus();

        if (this.state.active != "Featured") {
            this.toggleContainerSettings(true, this.state.collectionContainer);
        }
    }

    sortQuery = (results, query) => {
        results.sort((a, b) => {
            return b.popularity - a.popularity;
        });

        results = results.filter(movie => {
            let releaseDate = movie.release_date;
            let year = Number(releaseDate.substring(0, 4));
            let month = Number(releaseDate.substring(6, 7));

            let currentDate = new Date();
            currentDate = {
                year: currentDate.getFullYear(),
                month: currentDate.getMonth() + 1
            }

            return (movie.backdrop_path !== null && (year <= currentDate.year) && (year == currentDate.year
                ? (month < currentDate.month - 1)
                : true) && (movie.popularity > 2) && (movie.vote_average > 4) && (movie.original_language == "en"));
        });

        return results;
    }

    searchEmpty = (query) => {
        this.setState({searchContent: (
                <Fade bottom>
                    <div className="search-empty">
                        No Results for "{query.length > 20
                            ? query.substring(0, 20) + "..."
                            : query}"
                    </div>
                </Fade>
            )});
    }

    setOffline = (isOffline) => {
        this.setState({isOffline});
    }

    fetchContent = (url, callback, err) => {
        getJSON(url, (error, response) => {
            if (!error) {
                this.setOffline();
                if (callback) {
                    callback(response);
                }
            } else {
                if (err) {
                    err(error);
                }
            }
        });
    }

    searchMovies = () => {
        this.toggleSearch(true, this.state.searchContent);
        this.toggleContainerSettings(false, this.state.collectionContainer);

        let query = this.getElementValue(this.getSearch());

        if (query === "") {
            this.closeSearch();
        } else {
            let searchResults = [];
            for (let u = 1; u < 5; u++) {
                let url = `https://api.themoviedb.org/3/search/movie?api_key=${
                this.state.apiKey}&region=US&language=en-US&query=${query}&page=${u}&include_adult=false`;

                let promise = new Promise((resolve, reject) => {
                    this.fetchContent(url, (response) => {
                        let results = response.results;
                        resolve(results);
                    }, (error) => {
                        reject(error);
                    });
                }).catch(err => console.log(err));

                searchResults.push(promise);
            }

            Promise
                .all(searchResults)
                .then(results => {
                    this.setOffline();
                    results = []
                        .concat
                        .apply([], results);

                    if (!results.every(val => {
                        return !val;
                    })) {
                        results = this.sortQuery(results, query);

                        if (results.length === 0) {
                            this.searchEmpty(query);
                        } else {
                            this.toggleSearch(true, this.visualizeResults(results, true, true));
                        }
                    } else {
                        this.searchEmpty(query);
                    }
                })
                .catch(err => this.setOffline(true));
        }
    }

    initMovie = (movie) => {
        this.setState({playerLoading: true, playMovie: movie, time: "00:00:00"});
    }

    prepareMovieTitle = (title) => {
        return title
            .replace(/[^a-zA-Z0-9\s\-]/g, '')
            .replace(/\-/g, ' ')
            .toLowerCase();
    }

    checkMagnet = (movie) => {
        return new Promise((resolve, reject) => {
            let magnet = movie
                .magnet
                .toUpperCase();
            if (magnet.match(/^(?!.*(HDTS|HDTC|HD\.TS|HD\.TC|HD\-TS|HD\-TC|CAM))/g)) {
                resolve(movie);
            } else {
                movie.magnet = false;
                console.log('Previous magnet link was of low quality or different language.');
                reject(movie);
            }
        });
    }

    promiseTimeout = (ms, promise) => {
        let timeout = new Promise((resolve, reject) => {
            let id = setTimeout(() => {
                clearTimeout(id);
                reject('Timed out in ' + ms + 'ms.')
            }, ms)
        }).catch(err => console.log(err));

        return Promise.race([promise, timeout]);
    }

    setPlayerLoading = (playerLoading) => {
        this.setState({playerLoading});
    }

    setVideoIndex = (videoIndex) => {
        return new Promise((resolve, reject) => {
            this.setState({
                videoIndex
            }, () => {
                resolve();
            });
        });
    }

    resetVideo = () => {
        this.setPlayerLoading(true);
        this.setVideoIndex();
        this.setVideoError();
    }

    searchTorrent = (movie, reset) => {
        if (this.currentMagnet) {
            if (this.state.client) {
                if (this.state.client.get(this.currentMagnet)) {
                    this.removeTorrent(this.currentMagnet);
                }
            }
        }

        if (this.server) {
            this
                .server
                .close();
        }

        if (reset) {
            this.fetchAttempts = 0;
        }
        this.resetVideo();

        if (movie.magnet) {
            this
                .checkMagnet(movie)
                .then(cleanMovie => {
                    this.streamTorrent(cleanMovie);
                })
                .catch(movie => this.searchTorrent(movie));
        } else {
            this.fetchAttempts++;
            console.log(`Try #${this.fetchAttempts}`);
            let query = this.fetchAttempts > 3
                ? `${this.prepareMovieTitle(movie.title)}`
                : `${this.prepareMovieTitle(movie.title)} ${movie
                    .release_date
                    .substring(0, 4)}*`;
            let getTorrents = this.promiseTimeout(8000, this.torrentSearch.search(query));

            getTorrents.then(result => {
                if (result.length) {
                    this
                        .getPreferredTorrent(result)
                        .then(torrents => {
                            let torrent = torrents[0];
                            if (torrent) {
                                this.setState({
                                    backupTorrents: torrents
                                }, () => {
                                    if (this.state.playMovie) {
                                        this.state.playMovie.preferredTorrents = this.state.backupTorrents;
                                        this.changeCurrentMagnet(torrent.magnet);
                                        this.updateMovieTimeArray(true);
                                        this.fetchAttempts = 0;
                                        this.streamTorrent(torrent);
                                    }
                                });
                            } else {
                                this.applyTimeout();
                            }
                        });
                } else {
                    this.applyTimeout();
                }
            }).catch(err => {
                if (this.fetchAttempts == 6) {
                    this.fetchAttempts = 0;
                    this.applyTimeout();
                } else {
                    this.searchTorrent(movie);
                }
            });
        }
    }

    playMovie = (movie) => {
        movie = this.matchMovie(movie);
        this.initMovie(movie);
        this
            .toggleBox()
            .then(() => {
                this.searchTorrent(movie);
                this.addToRecentlyPlayed(movie);
            });
    }

    destroyClient = (backUp) => {
        return new Promise((resolve, reject) => {
            clearTimeout(this.timeOut);
            if (this.state.client) {
                this.setState({
                    playMovie: backUp
                        ? this.state.playMovie
                        : false,
                    videoIndex: false,
                    paused: true,
                    backupTorrents: backUp
                        ? this.state.backupTorrents
                        : false,
                    playerLoading: backUp
                        ? true
                        : false
                }, () => {
                    if (this.server) {
                        this
                            .server
                            .close();
                        this.server = false;
                    }

                    if (backUp) {
                        if (this.currentMagnet) {
                            if (this.state.client.get(this.currentMagnet)) {
                                this
                                    .removeTorrent(this.currentMagnet)
                                    .then((result) => {
                                        resolve(result);
                                    });
                            }
                        } else {
                            reject('No torrent.');
                        }
                    } else {
                        resolve();
                    }

                });
            }
        }).catch(err => console.log(err));
    }

    setFullScreen = (full) => {
        let browserWindow = require("electron")
            .remote
            .getCurrentWindow();

        if (full === undefined) {
            full = false;
        }
        browserWindow.setFullScreen(full);
    }

    setMovieTimeArray = () => {
        this.setState((prevState) => {
            if (prevState.movieTimeArray !== this.state.movieTimeArray) {
                return {movieTimeArray: this.state.movieTimeArray}
            }
        }, () => {
            this.setStorage();
        });
    }

    addToMovieTimeArray = (movie) => {
        this
            .state
            .movieTimeArray
            .push(movie);

        this.setMovieTimeArray();
    }

    changeCurrentMagnet = (magnet) => {
        this.currentMagnet = magnet;
    }

    getCurrentMagnet = () => {
        return this.currentMagnet;
    }

    updateMovieTimeArray = (alt) => {
        let matchingItem = this
            .state
            .movieTimeArray
            .find(movie => {
                return movie.id == this.state.playMovie.id;
            });

        if (matchingItem) {
            matchingItem.magnet = this.currentMagnet;
            if (alt) {
                matchingItem.preferredTorrents = this.state.playMovie.preferredTorrents;
            } else {
                matchingItem.currentTime = this.state.playMovie.currentTime;
            }
            this.setMovieTimeArray();
        } else {
            this.addToMovieTimeArray({id: this.state.playMovie.id, currentTime: this.state.playMovie.currentTime, magnet: this.currentMagnet});
        }

    }

    updateMovieTime = (time) => {
        if (this.state.playMovie) {
            if (time !== 0) {
                this.state.playMovie.currentTime = time;
                this.updateMovieTimeArray();
            }
        }
    }

    removeClient = (time) => {
        if (time) {
            this.updateMovieTime(time);
        }
        this.setState({
            error: false
        }, () => {
            this
                .destroyClient()
                .then(() => {
                    this
                        .removeTorrent(this.currentMagnet)
                        .then((result) => {
                            console.log(result);
                        });
                });
        });
        this.setFullScreen();
    }

    matchMovie = (movie) => {
        let matchingItem = this
            .state
            .movieTimeArray
            .find(item => {
                return item.id == movie.id;
            });

        if (matchingItem) {
            movie.magnet = matchingItem.magnet;
            this.changeCurrentMagnet(matchingItem.magnet);
            return movie;
        }

        return movie;
    }

    openBox = (movie) => {
        this.toggleBox(true);
        this.setState({movieCurrent: movie});
    }

    toggleBox = (active) => {
        return new Promise((resolve, reject) => {
            this.setState({
                showBox: active
            }, () => {
                resolve();
            });
        });
    }

    closeBackdrop = () => {
        this.toggleBox();
    }

    getHeader = (results) => {
        return results[0].backdrop_path;
    }

    setHeader = (url) => {
        this.setState({headerBg: url});
    }

    strip = (string, chars) => {
        return string.substring(0, chars);
    }

    setResults = (results) => {
        if (results) {
            results = results.slice();
            this.setState({results});
        }
    }

    visualizeResults = (results, featured, set) => {
        if (set) {
            this.setResults(results);
        }

        let items = results.map((movie, index) => (<MovieItem
            movie={movie}
            openBox={this.openBox}
            strip={this.strip}
            key={uniqid()}
            featured={featured}/>));

        return items;
    }

    getURLDate = (n, justYear) => {
        let date = new Date(),
            year = date.getFullYear(),
            month = date
                .getMonth()
                .toString()
                .length < 2
                ? '0' + (date.getMonth() + 1)
                : date.getMonth() + 1,
            day = date
                .getDate()
                .toString()
                .length < 2
                ? '0' + date.getDate()
                : date.getDate();

        if (justYear) {
            return (year - n)
        }

        return `${year - n}-${month}-${day}`
    }

    getFeatured = (resolve, reject, page) => {
        let url = `https://api.themoviedb.org/3/discover/movie?api_key=${
        this
            .state
            .apiKey}&region=US&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=1&primary_release_date.gte=${this
            .getURLDate(5, true)}&primary_release_date.lte=${this
            .getURLDate(1, true)}`;
        this.fetchContent(url, (response) => {
            resolve(response);
        }, (error) => {
            reject(error);
        });
    }

    loadFeatured = () => {
        this.toggleContainerSettings();
        let promise = new Promise((resolve, reject) => {
            this.getFeatured(resolve, reject);
        });

        promise.then(result => {
            this.setContent(this.visualizeResults(result.results, true, true));
        }, err => {
            this.setOffline(true);
        });
    }

    shuffleArray = (array) => {
        let currentIndex = array.length;
        let temporaryValue;
        let randomIndex;

        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }

    getMovies = (genre, genreID) => {
        let url = `https://api.themoviedb.org/3/discover/movie?api_key=${
        this
            .state
            .apiKey}&region=US&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=${Math
            .floor(Math.random() * this.state.genrePages) + 1}&primary_release_date.lte=${this.getURLDate(1)}&with_genres=${genreID}`;

        return new Promise((resolve, reject) => {
            this.fetchContent(url, (response) => {
                let genreComplete = {
                    name: genre,
                    genreID: genreID,
                    movies: this.shuffleArray(response.results)
                }
                resolve(genreComplete);
            }, (error) => {
                reject(error);
            });
        }).catch(err => console.log(err));
    }

    isRecent = (movie) => {
        return this
            .state
            .recentlyPlayed
            .find(item => {
                return item.id == movie.id;
            });
    }

    isFavorite = (movie) => {
        if (this.state.favorites) {
            return this
                .state
                .favorites
                .find(item => {
                    return item.id == movie.id;
                });
        } else {
            return false;
        }
    }

    chooseRandom = (array, limit) => {
        let results = [],
            previousItem = {};

        if (array.length < limit) {
            limit = array.length;
        }

        for (let i = 0; i <= limit; i++) {
            let item = array[Math.floor(Math.random() * array.length)];
            if (previousItem.title) {
                while (previousItem.title == item.title) {
                    item = array[Math.floor(Math.random() * array.length)];
                }
            }
            previousItem = item;
            results.push(item);
        }

        return results;
    }

    getRecommended = (url) => {
        return new Promise((resolve, reject) => {
            this.fetchContent(url, (response) => {
                resolve(response.results.slice(0, 5));
            }, (error) => {
                reject(error);
            });
        });
    }

    getSuggested = (movies) => {
        return new Promise((resolve, reject) => {
            let promises = [];
            let pages = [1, 2, 3];
            for (let j = 0; j < movies.length; j++) {
                let movie = movies[j],
                    page = this.chooseRandom(pages, 1),
                    url = `https://api.themoviedb.org/3/movie/${movie.id}/recommendations?api_key=${
                this
                    .state
                    .apiKey}&region=US&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=${page}&primary_release_date.lte=${this
                    .getURLDate(1)}`;
                let promise = this.getRecommended(url);
                promises.push(promise);
            }

            Promise
                .all(promises)
                .then((suggested) => {
                    resolve([].concat.apply([], suggested));
                })
                .catch((err) => reject(err));

        });
    }

    stripDuplicateMovies = (array) => {
        let unique = [],
            uniqueMovies = [];
        for (let k = 0; k < array.length; k++) {
            let movie = array[k];
            if (unique.indexOf(movie.id) === -1) {
                unique.push(movie.id);
                uniqueMovies.push(movie);
            }
        }

        return uniqueMovies;
    }

    updateSuggested = () => {
        let favorites = this.chooseRandom(this.state.favorites, 5),
            recents = this.chooseRandom(this.state.recentlyPlayed, 5),
            collection = favorites.concat(recents);

        this
            .getSuggested(collection)
            .then((suggested) => {
                let clean = this.stripDuplicateMovies(suggested);
                if (clean.length > 20) {
                    clean = clean.slice(0, 20);
                }

                clean = this.shuffleArray(clean);
                this.setState({
                    suggested: clean
                }, () => {
                    if (this.databaseRef) {
                        this.setBucket();
                    }
                });
            });
    }

    addToFavorites = (movie) => {
        this
            .state
            .favorites
            .push(movie);
        this.setState({
            favorites: this
                .state
                .favorites
                .slice()
        }, () => {
            this.setStorage();
        });
    }

    removeFromFavorites = (movie) => {
        let index = this
            .state
            .favorites
            .findIndex(item => {
                return item.id == movie.id;
            });
        this
            .state
            .favorites
            .splice(index, 1);
        this.setState({
            favorites: this
                .state
                .favorites
                .slice()
        }, () => {
            this.setStorage();
        });
    }

    addToRecentlyPlayed = (movie) => {
        if (!this.isRecent(movie)) {
            if (this.state.recentlyPlayed.length > 9) {
                this
                    .state
                    .recentlyPlayed
                    .splice(-1, 1);
            }

            this
                .state
                .recentlyPlayed
                .unshift(movie);
            this.setState({
                recentlyPlayed: this
                    .state
                    .recentlyPlayed
                    .slice()
            }, () => {
                this.setStorage();
            });
        } else {
            let index = this
                .state
                .recentlyPlayed
                .findIndex(item => {
                    return item.id == movie.id;
                });

            this
                .state
                .recentlyPlayed
                .splice(index, 1);
            this
                .state
                .recentlyPlayed
                .unshift(movie);
            this.setState({
                recentlyPlayed: this
                    .state
                    .recentlyPlayed
                    .slice()
            }, () => {
                this.setStorage();
            });
        }
    }

    easeInOutQuad = (t, b, c, d) => {
        t /= d / 2;
        if (t < 1) 
            return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    scrollTo = (id, element, to, duration, callback) => {
        let start = element.scrollLeft,
            change = to - start,
            currentTime = 0,
            increment = 20;

        let animateScroll = () => {
            currentTime += increment;
            let val = this.easeInOutQuad(currentTime, start, change, duration);
            element.scrollLeft = val;
            if (currentTime < duration) {
                setTimeout(animateScroll, increment);
            } else if (currentTime == duration) {
                if (callback) {
                    callback(id, element, to);
                }
            }
        }

        animateScroll();
    }

    scrollMovieGenre = (left, e, id) => {
        let viewportW = this.state.listWidth - 210;
        let boxW = document
            .querySelector(".movie-item")
            .offsetWidth + 10;
        let viewItems = Math.ceil(viewportW / boxW);

        let container = e
            .currentTarget
            .parentElement
            .parentElement
            .querySelector(".movie-list-paginated");

        let scrollVal = container.scrollLeft;

        if (left) {
            scrollVal -= boxW * viewItems;
        } else {
            scrollVal += boxW * viewItems;
        }

        id = "#" + id;

        this.scrollTo(id, container, scrollVal, 200, (id, container, scrollVal) => {
            if (container.scrollLeft + container.offsetWidth >= container.scrollWidth - 20) {
                this.setElementStyle(document.querySelector(id).querySelector(".movie-scroll-right"), "display", "none");
                this.setElementStyle(document.querySelector(id).querySelector(".movie-scroll-left"), "display", "flex");
            } else if (container.scrollLeft === 0) {
                this.setElementStyle(document.querySelector(id).querySelector(".movie-scroll-left"), "display", "none");
                this.setElementStyle(document.querySelector(id).querySelector(".movie-scroll-right"), "display", "flex");
            } else {
                this.setElementStyle(document.querySelector(id).querySelector(".movie-scroll-left"), "display", "flex");
                this.setElementStyle(document.querySelector(id).querySelector(".movie-scroll-right"), "display", "flex");
            }
        });
    }

    visualizeMovieGenres = (movieData) => {
        this.setResults([movieData[0].movies[0]]);
        let movieGenres = movieData.map((item, i) => (<GenreContainer
            toggleGenre={this.toggleGenre}
            genreID={item.genreID}
            scrollMovieGenre={this.scrollMovieGenre}
            openBox={this.openBox}
            strip={this.strip}
            name={item.name}
            movies={item.movies}
            key={uniqid()}
            setListWidth={this.setListWidth}/>));

        return movieGenres;
    }

    loadMovies = () => {
        this.toggleContainerSettings(true, false);

        let genres = [
            {
                "id": 28,
                "name": "Action"
            }, {
                "id": 12,
                "name": "Adventure"
            }, {
                "id": 16,
                "name": "Animation"
            }, {
                "id": 35,
                "name": "Comedy"
            }, {
                "id": 80,
                "name": "Crime"
            }, {
                "id": 99,
                "name": "Documentary"
            }, {
                "id": 18,
                "name": "Drama"
            }, {
                "id": 10751,
                "name": "Family"
            }, {
                "id": 14,
                "name": "Fantasy"
            }, {
                "id": 36,
                "name": "History"
            }, {
                "id": 27,
                "name": "Horror"
            }, {
                "id": 10402,
                "name": "Music"
            }, {
                "id": 9648,
                "name": "Mystery"
            }, {
                "id": 10749,
                "name": "Romance"
            }, {
                "id": 878,
                "name": "Sci-Fi"
            }, {
                "id": 10770,
                "name": "TV Movie"
            }, {
                "id": 53,
                "name": "Thriller"
            }, {
                "id": 10752,
                "name": "War"
            }, {
                "id": 37,
                "name": "Western"
            }
        ];

        let promiseArray = [];

        for (let j = 0; j < genres.length; j++) {
            let promise = new Promise((resolve, reject) => {
                this
                    .getMovies(genres[j].name, genres[j].id)
                    .then(genreComplete => {
                        resolve(genreComplete);
                    })
                    .catch(err => console.log(err));
            });

            promiseArray.push(promise);
        }

        Promise
            .all(promiseArray)
            .then(data => {
                this.setContent(this.visualizeMovieGenres(data));
            })
            .catch(() => this.setOffline(true))
    }

    loadCollection = () => {
        this.toggleContainerSettings(true, true);
        let headerSource = this.state.suggested
            ? this.state.suggested
            : this.state.recentlyPlayed
                ? this.state.recentlyPlayed
                : this.state.favorites
                    ? this.state.favorites
                    : false;
        this.setResults(headerSource);
    }

    setContent = (content) => {
        this.setState({content});
    }

    loadContent = (active) => {
        this.setContent(false);
        switch (active) {
            case "Featured":
                this.loadFeatured();
                break;
            case "Movies":
                this.loadMovies();
                break;
            case "Collection":
                this.loadCollection();
                break;
        }
    }

    handleMenu = () => {
        if (this.state.menuActive) {
            this.setElementStyle(document.querySelector(".app-menu-button"), "transform", `rotate(${this.state.menuActive
                ? "0"
                : "360"}deg)`);
            this.setState({menuActive: false});
        }
    }

    updateMenu = (menuActive, active) => {
        if (menuActive != undefined) {
            this.setState({menuActive});
        }

        if (active != undefined) {
            this.setState({
                active
            }, () => {
                this.loadContent(this.state.active);
            });
        }
    }

    handleLogo = () => {
        this.setState({logoIsLoaded: true});
    }

    loadLogo = () => {
        let tempImage = new Image();
        tempImage.onload = this.handleLogo;
        tempImage.src = 'assets/imgs/icon.png';
    }

    requireTorrent = () => {
        this.torrentSearch = TorrentSearch;
    }

    signIn = () => {
        let email = this.state.inputEmail.length
                ? this.state.inputEmail
                : this.state.user.email,
            password = this.state.inputPass.length
                ? this.state.inputPass
                : this.state.user.password;

        firebase
            .auth()
            .signInWithEmailAndPassword(email, password)
            .then(() => {
                this.closeAccount();
            })
            .catch((error) => {
                var errorCode = error.code;
                var errorMessage = error.message;
                this.setState({loginError: errorMessage});
            });
    }

    startFireBase = () => {
        let firebaseConfig = {
            apiKey: "AIzaSyAOWT7w9hA8qsLY-KP7F14Qfv9vLjw3YJM",
            authDomain: "flixerr-5aeb8.firebaseapp.com",
            databaseURL: "https://flixerr-5aeb8.firebaseio.com",
            projectId: "flixerr-5aeb8",
            storageBucket: "flixerr-5aeb8.appspot.com",
            messagingSenderId: "58493893285",
            appId: "1:58493893285:web:b02990447eb9f16f"
        };

        firebase.initializeApp(firebaseConfig);

        firebase
            .auth()
            .onAuthStateChanged((user) => {
                this.setState({user});
                if (user) {
                    this.createDataBase();
                    this.getBucket();
                    this.listenToBucket();
                }
                this.setUserCredentials();
            });

        if (!this.state.isGuest && this.state.user) {
            this.signIn();
        } else if (!this.state.isGuest && !this.state.user) {
            this.openAccount();
        } else if(!this.state.user){
            this.updateSuggested();
        }

    }

    handleAccount = () => {
        let email = this.state.inputEmail,
            password = this.state.inputPass;

        if (!email.length && !password.length) {
            this.setState({loginError: true});
        } else {

            if (this.state.create) {
                firebase
                    .auth()
                    .createUserWithEmailAndPassword(email, password)
                    .then(() => {
                        this.closeAccount();
                    })
                    .catch((error) => {
                        var errorCode = error.code;
                        var errorMessage = error.message;
                        this.setState({loginError: errorMessage});
                    });
            } else {
                this.signIn();
            }
        }
    }

    openAccount = () => {
        this.setState({create: false, loginError: false, account: true});
    }

    openAccountCreation = () => {
        this.setState({create: true, loginError: false, account: false});
    }

    closeAccount = () => {
        this.setState({
            inputEmail: '',
            inputPass: '',
            account: false,
            create: false,
            loginError: false,
            isGuest: true
        }, () => {
            this.setUserCredentials();
        });
    }

    closeBackup = () => {
        this.setState({backupIsOpen: false});
    }

    signOut = () => {
        firebase
            .auth()
            .signOut()
            .then(() => {
                this.databaseRef = false;
                this.setStorage();
            })
            .catch((error) => {
                console.log(error);
            });
    }

    handleInput = (e) => {
        let value = e.target.value;
        let isEmail = value.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/g);

        this.setState({
            [isEmail
                    ? 'inputEmail'
                    : 'inputPass']: value
        });
    }

    handleAccountSignin = () => {
        this.setState({
            create: false
        }, () => {
            this.handleAccount();
        });
    }

    handleAccountCreation = () => {
        this.setState({
            create: true
        }, () => {
            this.handleAccount();
        });
    }

    handleConnectionChange = (e) => {
        if (e.type == "offline") {
            this.setOffline(true);
        }
        if (e.type == "online") {
            this.setOffline();
            this.updateMenu(false, this.state.active);
            this.resetSearch();
        }
    }

    componentDidMount() {
        this.loadLogo();
        this.getStorage();
        this.getUserCredentials();
        this.loadContent(this.state.active);
        this.startWebTorrent();
        this.requireTorrent();
        window.addEventListener('online', this.handleConnectionChange);
        window.addEventListener('offline', this.handleConnectionChange);
    }

    render() {
        let menu = this.state.menuActive
            ? (<Menu
                menu={this.state.menu}
                user={this.state.user}
                openAccount={this.openAccount}
                signOut={this.signOut}
                active={this.state.active}
                updateMenu={this.updateMenu}
                resetSearch={this.resetSearch}/>)
            : null;

        let movieBackDrop = this.state.showBox
            ? (<div className="movie-container-bg" onClick={this.closeBackdrop}/>)
            : null;

        let movieModal = this.state.showBox
            ? (<MovieModal
                movie={this.state.movieCurrent}
                favorites={this.state.favorites}
                playMovie={this.playMovie}
                isFavorite={this.isFavorite}
                addToFavorites={this.addToFavorites}
                removeFromFavorites={this.removeFromFavorites}/>)
            : null;

        let playerModal = this.state.playMovie
            ? (<Player
                changeCurrentMagnet={this.changeCurrentMagnet}
                updateMovieTime={this.updateMovieTime}
                resetClient={this.destroyClient}
                togglePause={this.togglePause}
                showBackup={this.showBackup}
                openBackup={this.state.backupIsOpen}
                closeBackup={this.closeBackup}
                backupTorrents={this.state.backupTorrents}
                streamTorrent={this.streamTorrent}
                searchTorrent={this.searchTorrent}
                time={this.state.time}
                index={this.state.videoIndex}
                paused={this.state.paused}
                removeClient={this.removeClient}
                handleVideoClose={this.handleVideoClose}
                setFullScreen={this.setFullScreen}
                movie={this.state.movieCurrent}
                getCurrentMagnet={this.getCurrentMagnet}
                loading={this.state.playerLoading}
                setPlayerLoading={this.setPlayerLoading}
                setElementValue={this.setElementValue}
                getElementValue={this.getElementValue}
                error={this.state.error}
                handleVideo={this.handleVideo}/>)
            : null;

        let fullGenreContainer = this.state.showGenre
            ? (<Genre
                genre={this.state.activeGenre}
                genreID={this.state.genreID}
                apiKey={this.state.apiKey}
                fetchContent={this.fetchContent}
                visualizeResults={this.visualizeResults}
                setOffline={this.setOffline}
                closeGenre={this.closeGenre}/>)
            : null;

        let loadingContainer = this.state.appLoading
            ? <div className="loading-container">
                    <Fade when={this.state.logoIsLoaded} distance="10%" bottom>
                        <div className="logo"></div>
                    </Fade>
                </div>
            : null;

        let accountContainer = this.state.account
            ? <div className="account-container">
                    <Fade bottom distance="10%">
                        <div className="account-form">
                            <div className="account-close" onClick={this.closeAccount}>
                                <i className="mdi mdi-close"></i>
                            </div>
                            <div className="account-title">Sign in</div>
                            <div className="account-desc">Flixerr will use your account to synchronize data across all your devices.</div>
                            <input
                                type="email"
                                placeholder="Email"
                                autoFocus={true}
                                required
                                onKeyUp={this
                                .handleInput
                                .bind(this)}/>
                            <span></span>

                            <input
                                type="password"
                                placeholder="Password"
                                required
                                onKeyUp={this
                                .handleInput
                                .bind(this)}/>
                            <span></span>
                            {this.state.loginError
                                ? <Fade bottom distance="10%">
                                        <div className="login-error">{this.state.loginError}</div>
                                    </Fade>
                                : ''}
                            <div className="account-submit" onClick={this.handleAccountSignin}>Sign In</div>
                            <div className="divider"></div>
                            <div
                                className="account-submit account-secondary"
                                onClick={this.openAccountCreation}>Sign Up</div>
                        </div>
                    </Fade>
                </div>
            : null;

        let createContainer = this.state.create
            ? <div className="create-container account-container">
                    <div className="account-form">
                        <div className="account-close" onClick={this.closeAccount}>
                            <i className="mdi mdi-close"></i>
                        </div>
                        <div className="account-title">Create an account</div>
                        <div className="account-desc">Register to easily synchronize data across multiple devices.</div>
                        <input
                            type="email"
                            placeholder="Email"
                            autoFocus={true}
                            required
                            onKeyUp={this
                            .handleInput
                            .bind(this)}/>
                        <span></span>
                        <input
                            type="password"
                            placeholder="Password"
                            required
                            onKeyUp={this
                            .handleInput
                            .bind(this)}/>
                        <span></span>
                        {this.state.loginError
                            ? <Fade bottom distance="10%">
                                    <div className="login-error">{this.state.loginError}</div>
                                </Fade>
                            : ''}
                        <div className="account-submit" onClick={this.handleAccountCreation}>Create</div>
                        <div className="divider"></div>
                        <div className="account-submit account-secondary" onClick={this.openAccount}>Sign In</div>
                    </div>
                </div>
            : null;

        return (
            <div
                className={`app-container ${process.platform === "win32"
                ? "windows-compensate"
                : ''}`}
                onClick={this.handleMenu}>
                {process.platform === "darwin"
                    ? <div
                            className={'draggable ' + (this.state.playMovie
                            ? "invisible"
                            : "")}></div>
                    : ''}
                <ReactCSSTransitionGroup
                    transitionName="player-anim"
                    transitionEnterTimeout={300}
                    transitionLeaveTimeout={300}>
                    {createContainer}
                </ReactCSSTransitionGroup>
                <ReactCSSTransitionGroup
                    transitionName="player-anim"
                    transitionEnterTimeout={300}
                    transitionLeaveTimeout={300}>
                    {accountContainer}
                </ReactCSSTransitionGroup>
                <ReactCSSTransitionGroup
                    transitionName="loading-anim"
                    transitionEnterTimeout={0}
                    transitionLeaveTimeout={300}>
                    {loadingContainer}
                </ReactCSSTransitionGroup>
                <ReactCSSTransitionGroup
                    transitionName="genreContainer-anim"
                    transitionEnterTimeout={300}
                    transitionLeaveTimeout={300}>
                    {fullGenreContainer}
                </ReactCSSTransitionGroup>
                <ReactCSSTransitionGroup
                    transitionName="player-anim"
                    transitionEnterTimeout={300}
                    transitionLeaveTimeout={300}>
                    {playerModal}
                </ReactCSSTransitionGroup>
                <ReactCSSTransitionGroup
                    transitionName="movie-box-anim"
                    transitionEnterTimeout={300}
                    transitionLeaveTimeout={300}>
                    {movieModal}
                </ReactCSSTransitionGroup>
                <ReactCSSTransitionGroup
                    transitionName="box-anim"
                    transitionEnterTimeout={300}
                    transitionLeaveTimeout={300}>
                    {movieBackDrop}
                </ReactCSSTransitionGroup>
                <Header
                    subtitle={this.state.active}
                    menuActive={this.state.menuActive}
                    updateMenu={this.updateMenu}
                    background={this.state.headerBg}
                    closeSearch={this.closeSearch}
                    searchContent={this.state.searchContent}
                    searchMovies={this.searchMovies}
                    user={this.state.user}/>
                <ReactCSSTransitionGroup
                    transitionName="menu-anim"
                    transitionEnterTimeout={300}
                    transitionLeaveTimeout={300}>
                    {menu}
                </ReactCSSTransitionGroup>
                <Content
                    isOffline={this.state.isOffline}
                    content={this.state.content}
                    genre={this.state.genreContainer}
                    collectionContainer={this.state.collectionContainer}
                    suggested={this.state.suggested}
                    recentlyPlayed={this.state.recentlyPlayed}
                    favorites={this.state.favorites}
                    search={this.state.search}
                    searchContent={this.state.searchContent}
                    scrollMovieGenre={this.scrollMovieGenre}
                    getHeader={this.getHeader}
                    setHeader={this.setHeader}
                    strip={this.strip}
                    openBox={this.openBox}
                    results={this.state.results}
                    setListWidth={this.setListWidth}/>
            </div>
        )
    }
}

ReactDOM.render(
    <App/>, document.getElementById("app"));
