---
layout: post
title:  "Грабим корованы с Enlive, часть первая"
date:   "2014-02-27 21:00:00"
categories: clojure
---

Для своего проекта [ Codefest Stats 2012 ](https://github.com/glorphindale/codefest-stats) мне понадобились данные по зарегистрированным участникам. Попробуем с помощью LightTable и [Enlive](https://github.com/cgrand/enlive) пограбить [ данные за 2013 год ](http://2013.codefest.ru/members/).

Понадобится чистый проект c именем enlive-examples.

Нам понадобятся следующие зависимости в profile.clj:
{% highlight clojure %}
:dependencies [[org.clojure/clojure "1.5.1"]
               [enlive "1.1.5"]
               [cheshire "5.3.1"]]
{% endhighlight %}

Подключим библиотеку enlive в core.clj:
{% highlight clojure %}
(ns enlive-examples.core
    (:require [net.cgrand.enlive-html :as html]))
{% endhighlight %}

Структура элемента, который мы будем выдёргивать, такая:
{% highlight html %}
<li class="b-peoples__item">
    <span class="b-peoples__letter">A</span>
    Peter Asanov
    <span class="b-peoples__icons">
        <a href="https://twitter.com/#!/leaxdc" title="Twitter" target="_blank" class="icon icon_tw"></a>
        <a href="http://facebook.com/leaxdc" title="Facebook" target="_blank" class="icon icon_fb"></a>
        <a href="http://www.linkedin.com/pub/peter-asanov/24/a08/568" title="LinkedIn"
            target="_blank" class="icon icon_ld"></a>
    </span>
    <span class="b-peoples__company">EMC, Sr. Developer</span>
</li>
{% endhighlight %}

Нас интересуют: текстовое содержимое элемента &lt;li&gt;, и компания/должность участника.

Начнём с простого, как получить все поля компания/должность?

{% highlight clojure %}
;; Выбрать все span с классом b-peoples__company, которые лежат в li с классом b-peoples__item
(def selected
  (html/select raw-data [:li.b-peoples__item :> :span.b-peoples__company]))

(map html/text (take 5 selected))
;; ("EMC, Sr. Developer" "IndorSoft LLC, Project Manager" "Squzza Dev, CTO" "SoftService, web dev"
;; "Softage, инженер-программист")
{% endhighlight %}

Совет дня: по нажатию Ctrl-D LightTable выдаст документацию по символу под курсором, в том числе и по функциям enlive.

Сами по себе нас компании не интересуют, нам нужно получить связку ФИО + компания/должность.
Определим функцию, которая из элемента {% highlight html %}li class="b-peoples__item"{% endhighlight %} достанет все нужные данные, и поменяем функцию выбора элементов:

{% highlight clojure %}
(defn item->pair [item]
  (let [pname (-> item :content (nth 1) string/trim)
        [pcomp ppos] (-> (html/select item [:span.b-peoples__company html/text])
                         first
                         (string/split #","))]
    [pname pcomp ppos]))

(def selected
  (html/select raw-data [:li.b-peoples__item]))

(doall (map item->pair (take 3 selected)))
;; (["Peter Asanov" "EMC" " Sr. Developer"] ["Serge Barannik" "IndorSoft LLC" " Project Manager"]
;;  ["" "Squzza Dev" " CTO"])
{% endhighlight %}

Первые два элемента обработаны нормально, а в третьем что-то пошло не так. Методом внимательного взгляда обнаруживаем, что элемент
{% highlight html %}<li class="b-peoples__item">{% endhighlight %}
имеет два вида &mdash; с первой буквой фамилии и тегом
{% highlight html %}<span class="b-peoples__letter">{% endhighlight %}
и без. Простого способа доступиться до текстового узла с фамилией у enlive нет, поэтому придётся применить костыль (тем более, что мы делаем простой ограбитель, а не универсальное решение):

{% highlight clojure %}
(defn with-letter? [item]
  (= (-> item :content (#(nth % 1)) :attrs :class)
     "b-peoples__letter"))

(defn item->pair [item]
  (let [index (if (with-letter? item) 2 0)
        pname (-> item :content (nth index) string/trim)
        [pcomp ppos] (-> (html/select item [:span.b-peoples__company html/text])
                         first
                         (string/split #"," 2))]
    [pname pcomp ppos]))

(doall (map item->pair (take 5 selected)))
;; (["Peter Asanov" "EMC" " Sr. Developer"] ["Serge Barannik" "IndorSoft LLC" " Project Manager"]
;;  ["Rustam Baygulin" "Squzza Dev" " CTO"] ["Igor Dolgov" "SoftService" " web dev"]
;;  ["Alexey Efimov" "Softage" " инженер-программист"])

(def raw-data (map item->pair selected))
{% endhighlight %}

Теперь можно получить какие-нибудь интересные сведения:
{% highlight clojure %}
(take 5 (frequencies (map first raw-data)))
;; (["" 285] ["Денис Сандалов" 3] ["Дмитрий Турков" 3] ["Вадим Суворов" 3] ["Дмитрий Пашкевич" 3])
{% endhighlight %}

Мда. Опять не тот корован. Снова заберёмся в структуру документа:
{% highlight html %}
<div data-role="peoples-names" class="b-peoples__page" style="display: block;">
<div data-role="peoples-companies" class="b-peoples__page">
<div data-role="peoples-cities" class="b-peoples__page">
{% endhighlight %}

Правим селектор, выбираем только те
{% highlight html %}
<li class="b-peoples__item">
которые принадлежат
<div data-role="peoples-names">
{% endhighlight %}
Для этого воспользуемся хитрым селектором:
{% highlight clojure %} [[:div (html/attr= :data-role "peoples-names")] :li.b-peoples__item]
{% endhighlight %}
Что это такое? Первый элемент вектора говорит нам "выбери div, у которого класс &mdash; peoples-names", а второй &mdash; "у результата найди li с классом b-peoples_item".

{% highlight clojure %}
(def selected
  (html/select raw-data [[:div (html/attr= :data-role "peoples-names")] :li.b-peoples__item]))
(count selected)
;; 1514

(def grouped-data (map item->pair selected))
(take 5 (frequencies (map first grouped-data)))
;; (["" 97] ["Денис Сандалов" 1] ["Дмитрий Турков" 1] ["Вадим Суворов" 1] ["Дмитрий Пашкевич" 1])
{% endhighlight %}

Уже лучше, но 97 пустых записей отделяют наши данные от официального числа участников в 1417 человек.
Находим их:
{% highlight clojure %}
(take 3 (filter (comp empty? first) grouped-data))
;; (["" "Mirantis IT" " Software developer"] ["" "eBay" " Senior software engineer"] ["" "Badoo" nil])
{% endhighlight %}

Ага, у докладчиков свой собственный стиль тегов: имя обёрнуто в &lt;a&gt; Перетрясём преобразование элемента в человека:

{% highlight clojure %}
(defn item->name [item]
  (if-let [href (first (html/select item [[:a (html/attr-starts :href "/speaker")]]))]
    (-> href html/text)
    (if (with-letter? item)
      (-> item :content (nth 2) string/trim)
      (-> item :content (nth 0) string/trim))))

(defn item->person [item]
  (let [pname (item->name item)
        [pcomp ppos] (-> (html/select item [:span.b-peoples__company html/text])
                         first
                         (string/split #"," 2))]
    [pname pcomp ppos]))
(def grouped-data (map item->person selected))

(take 5 (filter (comp empty? first) grouped-data))
;; () пустых имён больше нет
(take 15 (frequencies (map first grouped-data)))
;; (["Денис Сандалов" 1] ["Дмитрий Турков" 1] ["Вадим Суворов" 1] ["Дмитрий Пашкевич" 1] ...

(->> grouped-data
     (map second)
     frequencies
     (sort-by second)
     reverse
     (take 10))
;; (["2ГИС" 122] ["Parallels" 61] ["Alawar Entertainment" 45] ["Сбербанк-Технологии" 26]
;;  ["СКБ Контур" 25] ["Тамтэк" 23] ["ЦФТ" 21] ["Сигнатек" 19] ["Центр автоматизации энергосбережения" 19]
;;  ["Softline" 17])
{% endhighlight %}

Наконец-то похоже на правду. Но сравнение по количеству людей с сайтом КотикФеста всё ещё даёт повод для грусти: например, "Центр автоматизации энергосбережения" на сайте представлен несколькими компаниями в разных написаниях.

{% highlight clojure %}
(defn item->person [item]
  (let [pname (item->name item)
        parts (-> (html/select item [:span.b-peoples__company html/text])
                         first
                         (string/split #"," 2))
        [pcomp ppos] (->> parts
                          (map string/trim)
                          (map string/lower-case))]
    [pname pcomp ppos]))

(->> grouped-data
     (map second)
     frequencies
     (sort-by second)
     reverse
     (take 15))
;; (["2гис" 122] ["parallels" 61] ["alawar entertainment" 45] ["сбербанк-технологии" 26]
;;  ["скб контур" 25] ["центр автоматизации энергосбережения" 24] ["тамтэк" 23] ["цфт" 21]
;;  ["сигнатек" 19] ["softline" 17] ["intel" 17] ["новотелеком" 16] ["ronas it" 16]
;;  ["7bits" 14] ["нгс" 14])
{% endhighlight %}

Для наших целей точности уже хватает. Осталось сохранить данные для последующей обработки:

{% highlight clojure %}
(ns enlive-examples.core
  (:require [clojure.string :as string]
            [cheshire.core :as chesh]
            [net.cgrand.enlive-html :as html]))

(spit "codefest-2013-raw.json" (chesh/generate-string grouped-data))
{% endhighlight %}

Полный исходник можно скачать [из Gist](https://gist.github.com/glorphindale/9234032).

Следующая остановка &mdash; преобразования и группировка.
