# boombot
Yet another music playing Discord bot...

This really has no special features.

## Features
* Plays YouTube videos, shorts, and playlists
* Can also play direct media
* Custom speed / nightcore support

## Setup
Docker (recommended)
1. `docker build . -t boombot`
2. `docker run --name boombot -d boombot`

Manual
1. Install git, ffmpeg, python3, and your distro's compilation tools
2. Make sure `python` maps to python3 (for example, by installing `python-is-python3`)
3. `npm install`
4. `npm start`

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)
