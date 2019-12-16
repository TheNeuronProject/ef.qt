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
			QSizePolicy::Policy __hp = QSizePolicy::Minimum, QSizePolicy::Policy __vp = QSizePolicy::Minimum);

		void setSizePolicy(QSizePolicy::Policy __hp, QSizePolicy::Policy __vp);;
		void setSize(int w, int h);
	};


	class EFMountingPoint {
	protected:
		QWidget *parent_widget = nullptr;
		QBoxLayout *parent_layout = nullptr;
		QWidget *placeholder_widget = nullptr;
		QWidget *mounted_widget = nullptr;

		size_t placeholder_index();

	public:
		void __set_widget(QWidget *__pw);

		QWidget *get() const noexcept {
			return mounted_widget;
		}

		void mount(QWidget *__w);

		void unmount();

		EFMountingPoint &operator=(QWidget *__w);
	};

	class EFListMountingPoint {
	protected:
		QWidget *parent_widget = nullptr;
		QBoxLayout *parent_layout = nullptr;
		QWidget *placeholder_widget = nullptr;
		std::deque<QWidget *> mounted_widget;

		size_t placeholder_index();

		bool widget_precheck(QWidget *__w);

	public:
		void __set_widget(QWidget *__pw);

		void push_back(QWidget *__w);
		void push_front(QWidget *__w);
		void pop_back();
		void pop_front();
		void insert(size_t __idx, QWidget *__w);
		void erase(size_t __idx);
		void erase_widget(QWidget *__w);

		size_t size() const noexcept {
			return mounted_widget.size();
		}

		const std::deque<QWidget *>& get() const noexcept {
			return mounted_widget;
		}

		// TODO: Bulk operation

		// void set(const std::deque<QWidget *>& __wl) {
		//
		// }
		// EFListMountingPoint &operator=(const std::deque<QWidget *>& __wl);
	};

	template <typename T>
	class EFVar {
	private:
		T _raw;
		std::deque<std::shared_ptr<std::function<void(const T&)>>> subscribers;

		void __call_subscribers() {
			for (auto &it : subscribers) {
				(*it)(_raw);
			}
		}
	public:
		void subscribe(const std::shared_ptr<std::function<void(const T&)>>& __callback) {
			subscribers.emplace_back(__callback);
			(*subscribers.back())(_raw);
		}

		void unsubscribe(const std::shared_ptr<std::function<void(const T&)>>& __callback) {
			for (size_t i=0; i<subscribers.size(); i++) {
				if (subscribers[i] == __callback) {
					subscribers.erase(subscribers.begin() + i);
					return;
				}
			}
		}

		friend inline void swap(EFVar& __first, EFVar& __second) noexcept {
			using std::swap;

			swap(__first._raw, __second._raw);
		}

		EFVar<T>() = default;

		explicit EFVar<T>(const T& __ival) {
			_raw = __ival;
		}

		inline EFVar<T> &operator=(EFVar<T> __val) {
			swap(*this, __val);

			return *this;
		};

		template <typename T2>
		inline EFVar &operator=(T2 __val) {
			_raw = __val;
			__call_subscribers();
			return *this;
		}

		inline T operator+(EFVar<T> __val) {
			return _raw + __val._raw;
		}

		inline bool operator==(const EFVar<T>& __val) {
			return _raw == __val._raw;
		}

		inline bool operator!=(const EFVar<T>& __val) {
			return _raw != __val._raw;
		}

		inline bool operator==(const T& __val) {
			return _raw == __val;
		}

		inline bool operator!=(const T& __val) {
			return _raw != __val;
		}

		inline explicit operator bool() {
			if (_raw)
				return true;
			else
				return false;
		}

		inline auto operator[](int __idx) {
			return _raw[__idx];
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
