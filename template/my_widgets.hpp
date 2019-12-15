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

#ifndef EFQT_STARTER_TEMPLATE_MY_WIDGETS_HPP
#define EFQT_STARTER_TEMPLATE_MY_WIDGETS_HPP

#include <QLabel>
#include <QWidget>
#include <Qt>

class ClickableLabel : public QLabel {
Q_OBJECT

public:
	explicit ClickableLabel(QWidget* parent = Q_NULLPTR, Qt::WindowFlags f = Qt::WindowFlags()) {
	}

	~ClickableLabel() = default;

signals:
	void clicked();

protected:
	void mousePressEvent(QMouseEvent* event) {
		emit clicked();
	}
};


#endif //EFQT_STARTER_TEMPLATE_MY_WIDGETS_HPP
