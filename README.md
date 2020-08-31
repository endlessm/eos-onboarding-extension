# Tour experience for gnome shell

## Build

```
meson _build --prefix=/usr
ninja -C _build
ninja -C _build install
```

## Translations

If you want to add a new language you should update the file
`po/LINUGAS` and add the new lang to the list.

To generate .pot files you should run:

```
ninja -C _build onboarding-extension-pot
```

To generate .po files you should run:

```
ninja -C _build onboarding-extension-update-po
```
