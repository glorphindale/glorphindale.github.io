---
layout: post
title:  "Incanter and the Bears"
date:   "2014-02-17 21:00:00"
categories: clojure
---

Как с помощью [Light Table](http://www.lighttable.com/) начать использовать [Incanter](http://incanter.org/)

Потребуются: [leiningen](http://leiningen.org/) и Light Table.

Выполняем в консоли:

{% highlight bash %}
lein new incanter-examples
{% endhighlight %}

Открываем profile.clj, правим секцию dependencies до состояния:
{% highlight clojure %}
:dependencies [[org.clojure/clojure "1.5.1"]
               [incanter "1.5.4"]]
{% endhighlight %}

Открываем LightTable, в File -> Open Folder -> выбираем incanter-examples

Нажимаем Ctrl+o -> incanter-examples/src/incanter-examples/core.clj

Нажимаем Ctrl+Space -> Add Connection -> Clojure -> project.clj

Правим секцию ns до состояния
{% highlight clojure %}
(ns incanter-examples.core
    (:require [incanter.core :as incore]
              [incanter.charts :as incharts]
              [incanter.stats :as instats]))
{% endhighlight %}

Нажимаем Ctrl+Enter на секции ns.

Добавляем в конец файла строку, на ней нажимаем Ctrl+Enter:

{% highlight clojure %}
(incore/view (incharts/histogram (instats/sample-normal 1000)))
{% endhighlight %}

Появился график нормального распределения. Первый шаг к ручному медведю сделан.

<center><img src="/images/first-histogram.png" alt="Histogram" width="700"></center>
