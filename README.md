# ef.qt
[ef.js](https://ef.js.org) equivalent for Qt

Make Qt great again!

## Important Note
This project is still in development. This is only a preview version of ef.qt. **Use it at your own risk.**

## What?
ef.qt is a simple mv\* framework which greatly simplifies your Qt application development. With UI and program logic completely seperated, ef.qt gives you whole control of your app while still remains full flexibility.

## Why do I need it?
Free you from the not very easy-to-use Qt Creator or creating tons of widgets and layouts manually, and mixing logic with UI heavily and has no chance to modify UI without touching the logic. With only the needed information exposed to your logic layer, you don't need to have UI and logic pasta together any more.

Start coding with modern design philosophy from NOW!

## Usage
Install `node` if not installed already. Personally I recommend using [n-install](https://github.com/mklement0/n-install).

Then

```shell script
npm i -g 'https://github.com/TheNeuronProject/ef.qt'

# Init a new project in current directory
efqt init

# Scan and generate cpp code for ef templates
efqt generate
```

For more usage please see `efqt --help`

## Documentation
TBD, refer to created template for now. Also [ef.js.org](https://ef.js.org) may help understanding the EFML language syntax and basic concept of ef frameworks.

## License
[MIT](https://cos.mit-license.org/)
