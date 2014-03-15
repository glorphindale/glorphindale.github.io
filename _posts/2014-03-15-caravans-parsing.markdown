---
layout: post
title:  "Грабим корованы с Enlive, часть вторая"
date:   "2014-03-05 21:00:00"
categories: clojure
---

В прошлый раз мы остановились на том, что получили сырые данные об участниках Codefest 2013. Чтобы можно было построить сколько-нибудь полезную статистику нам придётся сырые данные немного потушить до готовности.

Начнём с простого &mdash; преобразуем имена в пол. Уникальных имён у нас всего 192:
{% highlight clojure %}
(def data (chesh/parse-string (slurp "codefest-2013-raw.json") true))

(defn person->name [person]
  (-> person
      first
      (string/split #" " 2)
      first
      string/lower-case))

(def all-names (set (map person->name data)))

(count all-names) ;; 192
{% endhighlight %}

Попробуем написать правила преобразования:
{% highlight clojure %}
(defn name->sex [name]
  (let [letter (last name)]
    (cond
     (#{"данила" "тема" "илья" "тёма" "гриша" "никита" "юра" "nikita" "саша" "женя"} name) [name "m"]
     (#{\a \а \я} letter) [name "f"]
     (#{\н \й \р \r \n \л \с \в \п \д \x \w \m \s \y \l \м \т \ь \о \г \б \к \i \d \e \k} letter) [name "m"]
     :default [name "?"]
     )))

(frequencies (map second (map name->sex all-names)))
;; {\f 75, \m 117}

(defn person->sex [person]
  (-> person person->name name->sex))
{% endhighlight %}

Теперь попробуем уменьшить количество должностей, возьмём список преобразований из парсера 2012 года:
{% highlight clojure %}
(defn person->position [person]
  (-> person
      (#(if (nth % 2) (nth % 2) ""))
      string/lower-case))

(def all-positions (set (map person->position data)))

(count all-positions) ;; 569

(defn string-contains? [s vars]
  (seq (filter true? (map #(.contains s %) vars))))

(defn simplify-position [position]
  (cond
   (string-contains? position #{"hr" "персонал"}) [position "hr"]
   (string-contains? position #{"дизайнер" "ui" "интерф"}) [position "designer"]
   (string-contains? position #{"director" "директор" "manager" "начальник" "pm" "leader" "менеджер"
            "руководитель" "lead" "лидер" "рук."}) [position "mgmt"]
   (string-contains? position #{"qa" "тестирован" "качеств" "test" "тестировщик"}) [position "qa"]
   (string-contains? position #{"аналитик" "архи"}) [position "analysis"]
   (string-contains? position #{"developer" "разработчик" "программист" "engineer" "rnd"}) [position "developer"]
   (string-contains? position #{"админ"}) [position "admin"]
   (string-contains? position #{"студент"}) [position "student"]
   :default [position "na"]
   ))

(frequencies (map second (map simplify-position all-positions)))
;; {"mgmt" 182, "hr" 14, "developer" 118, "designer" 23, "admin" 8, "qa" 51, "student" 2, "analysis" 13, "?" 158}

(defn person->simple-position [person]
  (-> person person->position simplify-position))
{% endhighlight %}

Приступим к тяжёлому труду разгребателя данных из интернетов:
{% highlight clojure %}
(filter #(= (second %) "?") (map simplify-position all-positions))
;; (["" "?"] ["технический продюсер" "?"] ["верстальщик xaml" "?"] ["ios, android, techdoc" "?"] ["sdet" "?"] ["n/a" "?"] ["многостаночник" "?"] ["главный за тех. поддержку продуктов" "?"] ["гендир" "?"] ["llc, lowlevel optimizations voodoo" "?"] ["главный" "?"] ["сотрудник компании" "?"] ["junior game designer" "?"]
{% endhighlight %}

Люди крайне творчески подошли к задаче указания своей должности, отфильтруем данные в первом приближении:
{% highlight clojure %}

(defn simplify-position [position]
  (cond
   (string-contains? position #{"hr" "персонал" "алексей сухоруков" "людям"}) [position "hr"]
   (string-contains? position #{"дизайнер" "ui" "интерф" "designer" "ux"}) [position "designer"]
   (string-contains? position #{"director" "директор" "manager" "начальник" "pm" "cio"
                                "leader" "менеджер" "руководит" "lead" "лидер" "cto" "boss"
                                "рук." "владелец" "ceo" "главный" "лид" "chief" "пм" "mgr"
                                "управля" "гендир" "vp" "соучре" "управл" "coo" "партнер" "head"}) [position "mgmt"]
   (string-contains? position #{"qa" "тестирован" "качеств" "test" "тестировщик" "поняша"
                                "тестер" "sdet"}) [position "qa"]
   (string-contains? position #{"аналитик" "архи" "architect"}) [position "analysis"]
   (string-contains? position #{"developer" "разработчик" "программист" "програмист"
                                "engineer" "rnd" "инженер" "program"
                                "android" "java" "scala" "javascript" "sde"}) [position "developer"]
   (string-contains? position #{"админ" "admin" "devops"}) [position "admin"]
   (string-contains? position #{"студент"}) [position "student"]
   :default [position "na"]
   ))

(frequencies (map second (map simplify-position all-positions)))
;; {"mgmt" 224, "hr" 16, "developer" 132, "designer" 27, "admin" 10, "qa" 53, "na" 92, "student" 2, "analysis" 13}

(filter #(= (second %) "na") (map simplify-position all-positions))
;; (["" "na"] ["технический продюсер" "na"] ["верстальщик xaml" "na"] ["n/a" "na"] ["многостаночник" "na"] ["llc, lowlevel optimizations voodoo" "na"] ["сотрудник компании" "na"] ["business analyst" "na"] ["бухгалтер" "na"] ["разнорабочий" "na"] ["манагер праэктаф" "na"] ["практикант-магистр группы разработки по" "na"] ["патентный поверенный" "na"] ["#####" "na"] ["мп" "na"] ["html-coder" "na"] ["фронтэндир" "na"] ["ассистент департамента" "na"] ["строитель звезды смерти" "na"]
{% endhighlight %}

Дальше фильтровать смысла нет. Осталось разбить компании по размеру, для этого построим отображение "схлопнутое имя компании" &#8594; "примерный размер компании":

{% highlight clojure %}
(def all-companies (map second data))

(defn simplify-company [company]
  (cond
   (#{"2gis"} company) "2гис"
   (#{"ооо «компания холидей»"} company) "ооо \"компания холидей\""
   (#{"playtox llc"} company) "playtox"
   (#{"новео"} company) "noveo"
   (#{"Кадровое Агентство Алексея Сухорукова"} company) "Alexey Suhorukov's Recruitment Agency"
   :default company))

(defn bin-company [[c f]]
  (cond
   (< 0 f 2) {c "1"}
   (< 1 f 6) {c "2-5"}
   (< 5 f 11) {c "6-10"}
   (< 10 f 16) {c "11-15"}
   (< 15 f 21) {c "16-20"}
   (< 20 f 51) {c "21-50"}
   (< 50 f) {c "50+"}))

(def company-freqs
  (->> all-companies
       (map simplify-company)
       frequencies
       (map bin-company)
       (apply merge)))

(defn person->company-size [person]
  (-> person second simplify-company company-freqs))
{% endhighlight %}

Используя все полученные функции выполним итоговое преобразование:
{% highlight clojure %}
(defn transform-person [person]
  [(-> person person->sex second) (person->company-size person) (-> person person->simple-position second)])

(map transform-person (take 15 data))
;; (["m" "1" "developer"] ["m" "1" "mgmt"] ["m" "1" "mgmt"] ["m" "1" "na"] ["m" "2-5" "developer"]
;;  ["f" "16-20" "mgmt"] ["m" "26-50" "mgmt"] ["m" "2-5" "mgmt"] ["m" "1" "mgmt"] ["m" "50+" "qa"]
;;  ["f" "1" "na"] ["m" "50+" "qa"] ["f" "2-5" "designer"] ["m" "50+" "qa"] ["f" "6-10" "na"])
(def transformed-data (map transform-person data))
{% endhighlight %}

Теперь нужно схлопнуть данные и привести их к формату:
{% highlight json %}
var raw_data = [{"sex": "m", "company": "50+", "position": "admin", "amount": 5}, {"sex": "f", "company": "1", "position": "designer", "amount": 1}];
{% endhighlight %}

Для этого у нас есть прекрасная функция frequencies:

{% highlight clojure %}
(frequencies transformed-data)
;; {["m" "6-10" "developer"] 99, ["f" "16-20" "mgmt"] 6, ["m" "6-10" "hr"] 1, ["f" "50+" "designer"] 1,
{% endhighlight %}n

Приведём к окончательному виду:
{% highlight clojure %}

(defn finalize [[[sex company position] v]]
  {"sex" sex "company" company "position" position "amount" v})

(def result
  (str "var raw_data ="
    (chesh/generate-string
     (map finalize freqs))
    ";"))

(spit "codefest-2013.json" result)
{% endhighlight %}

Итог:
<center><img src="/images/codefest-2013-result.png" alt="Histogram" width="700"></center>
