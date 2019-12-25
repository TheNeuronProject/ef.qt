# ef.qt
[ef.js](https://ef.js.org) equivalent for Qt

Make Qt great again!

![efqt-demo-min](https://user-images.githubusercontent.com/10512422/70913644-652b5580-2051-11ea-9d49-79f18b96a9b2.gif)

## Important Note
This project is still in development. This is only a preview version of ef.qt. **Use it at your own risk.**

## What?
ef.qt is a simple mv\* framework which greatly simplifies your Qt application development. With UI and program logic seperated completely, ef.qt gives you whole control of your app while still remains full flexibility.

## Why do I need it?
Free you from the not very easy-to-use Qt Creator or creating tons of widgets and layouts manually, and mixing logic with UI heavily and has no chance to modify UI without touching the logic. With only the needed information exposed to your logic layer, you don't need to have UI and logic pasta together any more.

Start coding with modern design philosophy from NOW!

## How?
Check out https://github.com/TheNeuronProject/efqt-hello-world for a very quick example!

![image](https://user-images.githubusercontent.com/10512422/71104060-2aaeed80-21f6-11ea-87a9-64668935d1f2.png)

![image](https://user-images.githubusercontent.com/10512422/71104073-30a4ce80-21f6-11ea-9969-18cc30c0b3af.png)

## Usage
Install `node` if not installed already. Personally I recommend using [n-install](https://github.com/mklement0/n-install). Node v10 or above is required.

Then

```shell script
# If installed from elsewhere, first remove with
npm r -g ef.qt

# Install brand new or update
npm i -g 'https://github.com/TheNeuronProject/ef.qt'

# Init a new project in current directory
efqt init

# Scan and generate cpp code for ef templates
efqt generate

# Watch file change and auto re-compile
efqt watch

# Generate auto completion for shells
efqt completion
```

For more usage please see `efqt --help`

## Development
```shell script
# If installed from elsewhere, first remove with
npm r -g ef.qt

# Clone the repository
git clone 'https://github.com/TheNeuronProject/ef.qt'

# Install locally
cd ef.qt
npm i -g .

# To update dependencies after a pull or branch switch, do
npm i
```

and you are good to go. No need for re-install after modification, it works out of the box.

## Documentation
TBD, refer to created template for now. Also [ef.js.org](https://ef.js.org) may help understanding the EFML language syntax and basic concept of ef frameworks.

## License
[MIT](https://cos.mit-license.org/)
