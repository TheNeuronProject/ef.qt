# ef.qt
[ef.js](https://ef.js.org) equivalent for Qt

Make Qt great again!

![efqt-demo-min](https://user-images.githubusercontent.com/10512422/70913644-652b5580-2051-11ea-9d49-79f18b96a9b2.gif)

## Important Note
This project is still in development. This is only a preview version of ef.qt. **Use it at your own risk.**

## What?
ef.qt is a simple mv\* framework which greatly simplifies your Qt application development. With UI and program logic completely seperated, ef.qt gives you whole control of your app while still remains full flexibility.

## Why do I need it?
Free you from the not very easy-to-use Qt Creator or creating tons of widgets and layouts manually, and mixing logic with UI heavily and has no chance to modify UI without touching the logic. With only the needed information exposed to your logic layer, you don't need to have UI and logic pasta together any more.

Start coding with modern design philosophy from NOW!

## How?
Check out https://github.com/TheNeuronProject/efqt-hello-world for a very quick example!

![image](https://user-images.githubusercontent.com/10512422/70927016-2903ef00-2069-11ea-8385-2b004fc914af.png)

![image](https://user-images.githubusercontent.com/10512422/70927169-78e2b600-2069-11ea-80d0-39e07af03a85.png)

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
