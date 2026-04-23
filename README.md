# 🦥 Sloth.js
![License](https://img.shields.io/badge/License-MIT-blue.svg)

> **Move slow. Build fast.**
> Frontend for lazy developers.

Sloth.js is a lightweight, framework-agnostic JavaScript library designed for **backend developers who want to write less frontend code**.

No boilerplate. No complexity. Just get things done.

---

## 🚀 Why Sloth.js?

If you’ve ever thought:

* “Why do I need 20 lines just to handle a click?”
* “Why is frontend so verbose?”
* “I just want this form to work…”

Sloth.js exists for you.

---

## ⚡ Features

* ✅ Declarative actions (`data-click`, `data-submit`)
* 🔄 Reactive state with `data-bind`
* 📦 Built-in fetch wrapper
* 🧠 Form serialization (JSON out of the box)
* ✔️ HTML-driven validation
* 🧩 Simple template rendering
* 🌐 Hash-based routing
* 🎯 Event delegation (no duplicates)
* ⏳ Global loader support

---

## 📦 Installation

Just include it:

```html
<script type="module">
  import app from './sloth.min.js';
</script>
```

---

## ⚡ Quick Example

### HTML

```html
<button data-click="sayHello">Click me</button>
<p id="result"></p>
```

### JavaScript

```js
import app from './sloth.js';

app.actions({
  sayHello: () => {
    app.el('#result').text('Hello from Sloth 🦥');
  }
});
```

---

## 🧠 Declarative Actions

Write less JS. Let HTML drive behavior.

```html
<button data-click="deleteUser(42)">Delete</button>

<form data-submit="createUser">
  <input name="name" />
  <button type="submit">Save</button>
</form>
```

```js
app.actions({
  deleteUser: ({ params }) => {
    console.log(params[0]);
  },

  createUser: ({ data }) => {
    console.log(data);
  }
});
```

---

## 🔄 Auto Bind (Reactive State)

```html
<input id="nameInput" />
<p>Hello, <strong data-bind="user.name"></strong></p>
```

```js
const state = app.bind({
  user: { name: "" }
});

document.getElementById("nameInput")
  .addEventListener("input", e => {
    state.user.name = e.target.value;
  });
```

---

## 📋 Forms → JSON

```html
<form id="form">
  <input name="name" />
  <input type="checkbox" name="active" />
</form>
```

```js
const data = app.formToJSON('#form');
```

Output:

```json
{
  "name": "Rodrigo",
  "active": true
}
```

---

## ✔️ Validation (HTML-driven)

```html
<input name="email" data-required data-email />
```

```js
const result = app.validate('#form');

if (!result.valid) {
  console.log(result.errors);
}
```

---

## 🌐 HTTP Requests

```js
app.setBaseURL("https://api.example.com");

const users = await app.get("/users");
const user = await app.post("/users", { name: "John" });
```

---

## 🧩 Template Rendering

```js
const html = app.render(
  "<h1>{user.name}</h1>",
  { user: { name: "Rodrigo" } }
);
```

---

## 🧭 Routing

```js
app
  .route('/user/:id', (params) => {
    console.log(params.id);
  })
  .startRouter();
```

---

## ⏳ Loader

```js
app.showLoader();
app.hideLoader();

app.setLoader("<div>Loading...</div>");
```

---

## 🧱 DOM Utilities

```js
app.el('#title').text('Hello');
app.els('.item').addClass('active');
```

---

## 🎯 Philosophy

Sloth.js is not a framework.

It does **not** try to replace React, Vue, or Angular.

Instead, it focuses on:

* Reducing boilerplate
* Simplifying common tasks
* Letting backend developers stay productive

---

## ⚠️ What Sloth.js is NOT

* ❌ No virtual DOM
* ❌ No component system
* ❌ No complex reactivity
* ❌ No magic abstractions

---

## 💡 Mental Model

> Think of it as a modern jQuery — but cleaner, smarter, and focused on productivity.

---

## 🛠 Roadmap

* [ ] CDN version
* [ ] Devtools / debug mode
* [ ] Plugin system

---

## 🤝 Contributing

PRs are welcome.

If it makes things simpler → it's good.
If it adds complexity → rethink it.

---

## 📄 License

MIT

---

## 🦥 Final Thought

If you're writing too much frontend code...

You're probably not using Sloth.
