# ef.qt Starter Template
This is a starter template for ef.qt. Modify anything for your very own need.

## How to build

### Using cmake

```shell script
# generate ef.hpp
efqt generate

# create build directory
mkdir build
cd build

# build
cmake ..
make -j `nproc`

# run built demo
./efqt_starter_template
```

### Using qmake

```shell script
# generate ef.hpp
efqt generate
```

Then just open this project in Qt Creator and click `Run`.
