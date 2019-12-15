cmake_minimum_required(VERSION 3.0)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOMOC ON)

project(efqt_starter_template)

if(CMAKE_VERSION VERSION_LESS "3.7.0")
    set(CMAKE_INCLUDE_CURRENT_DIR ON)
endif()

find_package(Qt5 COMPONENTS Widgets REQUIRED)

include_directories(${Qt5Widgets_INCLUDE_DIRS})

add_executable(efqt_starter_template
        main.cpp
        resources.qrc
        ef.hpp ef_core.hpp ef_core.cpp my_widgets.hpp)


target_link_libraries(efqt_starter_template Qt5::Widgets)
