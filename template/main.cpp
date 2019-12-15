/*
    This file is part of ef.qt.
    Copyright (C) 2019 ClassicOldSong
    Copyright (C) 2019 ReimuNotMoe

    This program is free software: you can redistribute it and/or modify
    it under the terms of the MIT License.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
*/

#include <QApplication>
#include <QTimer>
#include <QGraphicsOpacityEffect>
#include <cmath>

#include "ef.hpp"

int main(int argc, char **argv) {
	QApplication app(argc, argv);

	auto mw = new ef::ui::MainWindow;
	auto timer = new QTimer(mw);
	float time_ = 0;
	size_t clicked_count = 0;
	QGraphicsOpacityEffect effect;
	QString awesome_text;

	auto opacityUpdater = [&](){
		if (time_ <= 1) {
			time_ += 0.01;
			effect.setOpacity(time_ * M_PI / 2);
			mw->$refs.logo->setGraphicsEffect(&effect);
			timer->start(16);
		} else {
			mw->$data.awesome_text = awesome_text;
		}
	};

	QObject::connect(timer, &QTimer::timeout, opacityUpdater);
	mw->$methods.logo_clicked = [&](ef::ui::MainWindow& state){
		auto &fn = mw->$data.logo_filename;
		time_ = 0;
		timer->stop();
		effect.setOpacity(time_);

		if (clicked_count % 2) {
			mw->$data.logo_filename = "logo.png";
		} else {
			mw->$data.logo_filename = "efqt.png";
		}

		auto m = clicked_count % 3;
		switch (m) {
			case 0:
				awesome_text = " is awesome!";
				break;
			case 1:
				awesome_text = " is very awesome!";
				break;
			case 2:
				awesome_text = " is so cool!";
				break;
			default:
				break;
		}

		timer->start();
		clicked_count++;
	};

	mw->show();

	return app.exec();
}
