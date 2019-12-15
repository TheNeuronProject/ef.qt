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

#ifndef EF_CORE_HPP
#define EF_CORE_HPP

#include <QString>
#include <QObject>
#include <QLayout>
#include <QFrame>
#include <QSpacerItem>

#include <deque>
#include <memory>

#include <functional>

namespace ef::core {
	class EFSpacerItem : public QSpacerItem {
	private:
		int _width = 1, _height = 1;
		QSizePolicy::Policy hp = QSizePolicy::Minimum, vp = QSizePolicy::Minimum;
	public:
		EFSpacerItem(int __w = 1, int __h = 1,
			QSizePolicy::Policy __hp = QSizePolicy::Minimum, QSizePolicy::Policy __vp = QSizePolicy::Minimum) :
			QSpacerItem(__w, __h, __hp, __vp) {

		}

		void setSizePolicy(QSizePolicy::Policy __hp, QSizePolicy::Policy __vp) {
			hp = __hp;
			vp = __vp;
			changeSize(_width, _height, hp, vp);
		};

		void setSize(int w, int h) {
			_width = w;
			_height = h;
			changeSize(_width, _height, hp, vp);
		}
	};


	class EFMountingPoint {
	protected:
		QWidget *parent_widget = nullptr;
		QBoxLayout *parent_layout = nullptr;
		QWidget *placeholder_widget = nullptr;
		QWidget *mounted_widget = nullptr;

		size_t placeholder_index() {
			for (size_t i=0; i<parent_layout->count(); i++) {
				if (parent_layout->itemAt(i)->widget() == placeholder_widget) {
					return i;
				}
			}

			throw std::logic_error("placeholder not found in parent layout");
		}

	public:
		void __set_widget(QWidget *__pw) {
			parent_layout = (QBoxLayout *)__pw->layout();
			parent_widget = __pw;
			placeholder_widget = new QFrame(parent_widget);
			if (parent_layout)
				parent_layout->addWidget(placeholder_widget);
			placeholder_widget->hide();
		}

//		QWidget *widget() const noexcept {
//			return target_widget;
//		}

		void mount(QWidget *__w) {
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

		void unmount() {
			if (mounted_widget){
				parent_layout->removeWidget(mounted_widget);
				mounted_widget->setParent(nullptr);
				mounted_widget = nullptr;
			}
		}

		EFMountingPoint &operator=(QWidget *__w) {
			if (__w)
				mount(__w);
			else
				unmount();

			return *this;
		}
	};

	class EFListMountingPoint {
	protected:
		QWidget *parent_widget = nullptr;
		QBoxLayout *parent_layout = nullptr;
		QWidget *placeholder_widget = nullptr;
		std::deque<QWidget *> mounted_widget;

		size_t placeholder_index() {
			for (size_t i=0; i<parent_layout->count(); i++) {
				if (parent_layout->itemAt(i)->widget() == placeholder_widget) {
					return i;
				}
			}

			throw std::logic_error("placeholder not found in parent layout");
		}

		bool widget_precheck(QWidget *__w) {
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

	public:
		void __set_widget(QWidget *__pw) {
			parent_layout = (QBoxLayout *)__pw->layout();
			parent_widget = __pw;
			placeholder_widget = new QFrame(parent_widget);
			if (parent_layout)
				parent_layout->addWidget(placeholder_widget);
			placeholder_widget->hide();
		}

		size_t size() {
			return mounted_widget.size();
		}

		void push_back(QWidget *__w) {
			if (!widget_precheck(__w))
				return;

			__w->setParent(parent_widget);
			parent_layout->insertWidget(placeholder_index(), __w);
			mounted_widget.emplace_back(__w);
		}

		void push_front(QWidget *__w) {
			if (!widget_precheck(__w))
				return;

			__w->setParent(parent_widget);
			parent_layout->insertWidget(placeholder_index() - mounted_widget.size(), __w);
			mounted_widget.emplace_front(__w);
		}

		void pop_back() {
			if (!mounted_widget.empty()) {
				auto &it = mounted_widget.back();
				if (parent_layout)
					parent_layout->removeWidget(it);
				it->setParent(nullptr);
				mounted_widget.pop_back();
			}
		}

		void pop_front() {
			if (!mounted_widget.empty()) {
				auto &it = mounted_widget.front();
				if (parent_layout)
					parent_layout->removeWidget(it);
				it->setParent(nullptr);
				mounted_widget.pop_front();
			}
		}

		void insert(size_t __idx, QWidget *__w) {
			if (__idx > mounted_widget.size()) {
				throw std::logic_error("");
			}

			if (!widget_precheck(__w))
				return;

			__w->setParent(parent_widget);
			parent_layout->insertWidget(placeholder_index() - mounted_widget.size() + __idx, __w);
			mounted_widget.insert(mounted_widget.begin() + __idx, __w);
		}

		void erase(size_t __idx) {
			if (__idx < mounted_widget.size()) {
				auto &it = mounted_widget[__idx];
				if (parent_layout)
					parent_layout->removeWidget(it);
				it->setParent(nullptr);
				mounted_widget.erase(mounted_widget.begin() + __idx);
			}
		}

		void erase_widget(QWidget *__w) {
			for (size_t i=0; i<mounted_widget.size(); i++) {
				if (mounted_widget[i] == __w) {
					mounted_widget.erase(mounted_widget.begin() + i);
				}
			}

			parent_layout->removeWidget(__w);
			__w->setParent(nullptr);
		}

		const std::deque<QWidget *>& get() const {
			return mounted_widget;
		}

		void set(const std::deque<QWidget *>& __wl) {
			// TODO
		}

		EFListMountingPoint &operator=(const std::deque<QWidget *>& __wl) {
			set(__wl);
			return *this;
		}
	};

	class EFString {
	private:
		mutable QString _raw;
		std::deque<std::shared_ptr<std::function<void(const QString&)>>> subscribers;

		void __call_subscribers();
	public:
		void subscribe(const std::shared_ptr<std::function<void(const QString&)>>& __callback);
		void unsubscribe(const std::shared_ptr<std::function<void(const QString&)>>& __callback);

		bool operator==(const EFString& __other) const;
		bool operator!=(const EFString& __other) const;

		EFString &operator=(const EFString& __efs);
		EFString &operator=(const char *__str);
		EFString &operator=(const QByteArray &__arr);
		EFString &operator=(char __c);
		EFString &operator=(QChar __c);
		EFString &operator=(const QString &__str);

		inline QString* operator->() const noexcept {
			return &_raw;
		}

		inline QString& operator*() noexcept {
			return _raw;
		}

		explicit inline operator QString&() noexcept {
			return _raw;
		}

		explicit inline operator const QString&() const noexcept {
			return _raw;
		}
	};

	template <typename T>
	class EFNumber {
	private:
		T _raw;
		std::deque<std::shared_ptr<std::function<void(T)>>> subscribers;

		void __call_subscribers() {
			for (auto &it : subscribers) {
				(*it)(_raw);
			}
		}
	public:
		void subscribe(const std::shared_ptr<std::function<void(T)>>& __callback) {
			subscribers.emplace_back(__callback);
			(*subscribers.back())(_raw);
		}

		void unsubscribe(const std::shared_ptr<std::function<void(T)>>& __callback) {
			for (size_t i=0; i<subscribers.size(); i++) {
				if (subscribers[i] == __callback) {
					subscribers.erase(subscribers.begin() + i);
					return;
				}
			}
		}

		inline EFNumber &operator=(T __num) {
			_raw = __num;
			__call_subscribers();
			return *this;
		}

		inline T operator*() const noexcept {
			return _raw;
		}

		explicit inline operator T() const noexcept {
			return _raw;
		}
	};

}

#endif // EF_CORE_HPP
