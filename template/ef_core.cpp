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

void EFString::__call_subscribers() {
	for (auto &it : subscribers) {
		(*it)(_raw);
	}
}

void EFString::subscribe(const std::shared_ptr<std::function<void(const QString &)>> &__callback) {
	subscribers.emplace_back(__callback);
	(*subscribers.back())(_raw);

}

void EFString::unsubscribe(const std::shared_ptr<std::function<void(const QString &)>> &__callback) {
	for (size_t i=0; i<subscribers.size(); i++) {
		if (subscribers[i] == __callback) {
			subscribers.erase(subscribers.begin() + i);
			return;
		}
	}
}

EFString &EFString::operator=(const char *__str) {
	_raw = QString::fromUtf8(__str);
	__call_subscribers();
	return *this;
}

EFString &EFString::operator=(const QByteArray &__arr) {
	_raw = QString::fromUtf8(__arr);
	__call_subscribers();
	return *this;
}

EFString &EFString::operator=(char __c) {
	_raw = QChar::fromLatin1(__c);
	__call_subscribers();
	return *this;
}

EFString &EFString::operator=(QChar __c) {
	_raw = __c;
	__call_subscribers();
	return *this;
}

EFString &EFString::operator=(const QString &__str) {
	_raw = __str;
	__call_subscribers();
	return *this;
}

EFString &EFString::operator=(const EFString &__efs) {
	_raw = __efs._raw;
	__call_subscribers();
	return *this;
}

bool EFString::operator==(const EFString &__other) const {
	return _raw == __other._raw;
}

bool EFString::operator!=(const EFString &__other) const {
	return _raw != __other._raw;
}
