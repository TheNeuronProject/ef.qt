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

#include "ef_core.hpp"

using namespace ef::core;

EFSpacerItem::EFSpacerItem(int __w, int __h, QSizePolicy::Policy __hp, QSizePolicy::Policy __vp) :
	QSpacerItem(__w, __h, __hp, __vp) {

}

void EFSpacerItem::setSizePolicy(QSizePolicy::Policy __hp, QSizePolicy::Policy __vp) {
	hp = __hp;
	vp = __vp;
	changeSize(_width, _height, hp, vp);
}

void EFSpacerItem::setSize(int w, int h) {
	_width = w;
	_height = h;
	changeSize(_width, _height, hp, vp);
}

size_t EFMountingPoint::placeholder_index() {
	for (size_t i=0; i<parent_layout->count(); i++) {
		if (parent_layout->itemAt(i)->widget() == placeholder_widget) {
			return i;
		}
	}

	throw std::logic_error("placeholder not found in parent layout");
}

void EFMountingPoint::__set_widget(QWidget *__pw) {
	parent_layout = (QBoxLayout *)__pw->layout();
	parent_widget = __pw;
	placeholder_widget = new QFrame(parent_widget);
	if (parent_layout)
		parent_layout->addWidget(placeholder_widget);
	placeholder_widget->hide();
}

void EFMountingPoint::mount(QWidget *__w) {
	if (parent_widget == __w) {
		throw std::logic_error("self can't be its child");
	}

	if (mounted_widget == __w) {
		qDebug("efqt warning: mounting same widget");
		return;
	}

	unmount();

	__w->setParent(parent_widget);
	parent_layout->insertWidget(placeholder_index(), __w);
	mounted_widget = __w;
}

void EFMountingPoint::unmount() {
	if (mounted_widget){
		parent_layout->removeWidget(mounted_widget);
		mounted_widget->setParent(nullptr);
		mounted_widget = nullptr;
	}
}

EFMountingPoint &EFMountingPoint::operator=(QWidget *__w) {
	if (__w)
		mount(__w);
	else
		unmount();

	return *this;
}

size_t EFListMountingPoint::placeholder_index() {
	for (size_t i=0; i<parent_layout->count(); i++) {
		if (parent_layout->itemAt(i)->widget() == placeholder_widget) {
			return i;
		}
	}

	throw std::logic_error("placeholder not found in parent layout");
}

bool EFListMountingPoint::widget_precheck(QWidget *__w) {
	if (parent_widget == __w) {
		throw std::logic_error("self can't be its child");
	}


	for (auto &it : mounted_widget) {
		if (it == __w) {
			qDebug("efqt warning: mounting same widget");
			return false;
		}
	}

	return true;
}

void EFListMountingPoint::__set_widget(QWidget *__pw) {
	parent_layout = (QBoxLayout *)__pw->layout();
	parent_widget = __pw;
	placeholder_widget = new QFrame(parent_widget);
	if (parent_layout)
		parent_layout->addWidget(placeholder_widget);
	placeholder_widget->hide();
}

void EFListMountingPoint::push_back(QWidget *__w) {
	if (!widget_precheck(__w))
		return;

	__w->setParent(parent_widget);
	parent_layout->insertWidget(placeholder_index(), __w);
	mounted_widget.emplace_back(__w);
}

void EFListMountingPoint::push_front(QWidget *__w) {
	if (!widget_precheck(__w))
		return;

	__w->setParent(parent_widget);
	parent_layout->insertWidget(placeholder_index() - mounted_widget.size(), __w);
	mounted_widget.emplace_front(__w);
}

void EFListMountingPoint::pop_back() {
	if (!mounted_widget.empty()) {
		auto &it = mounted_widget.back();
		if (parent_layout)
			parent_layout->removeWidget(it);
		it->setParent(nullptr);
		mounted_widget.pop_back();
	}
}

void EFListMountingPoint::pop_front() {
	if (!mounted_widget.empty()) {
		auto &it = mounted_widget.front();
		if (parent_layout)
			parent_layout->removeWidget(it);
		it->setParent(nullptr);
		mounted_widget.pop_front();
	}
}

void EFListMountingPoint::insert(size_t __idx, QWidget *__w) {
	if (__idx > mounted_widget.size()) {
		throw std::logic_error("");
	}

	if (!widget_precheck(__w))
		return;

	__w->setParent(parent_widget);
	parent_layout->insertWidget(placeholder_index() - mounted_widget.size() + __idx, __w);
	mounted_widget.insert(mounted_widget.begin() + __idx, __w);
}

void EFListMountingPoint::erase(size_t __idx) {
	if (__idx < mounted_widget.size()) {
		auto &it = mounted_widget[__idx];
		if (parent_layout)
			parent_layout->removeWidget(it);
		it->setParent(nullptr);
		mounted_widget.erase(mounted_widget.begin() + __idx);
	}
}

void EFListMountingPoint::erase_widget(QWidget *__w) {
	for (size_t i=0; i<mounted_widget.size(); i++) {
		if (mounted_widget[i] == __w) {
			mounted_widget.erase(mounted_widget.begin() + i);
		}
	}

	parent_layout->removeWidget(__w);
	__w->setParent(nullptr);
}