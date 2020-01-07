DROP TABLE IF EXISTS example;

CREATE TABLE example (
  id SERIAL PRIMARY KEY,
  name text DEFAULT NULL,
  description text DEFAULT NULL,
  author text DEFAULT NULL,
  language text DEFAULT NULL,
  code text DEFAULT NULL,
  tags text DEFAULT NULL
);

INSERT INTO example (name, description, author, language, code, tags) VALUES
  ('mod_test','Prints mod 2','Daniel Wohlmuth','Kotlin','println(x % 2)','mod,kotlin'),
  ('mod_test4','Prints mod 4','Daniel Wohlmuth','Kotlin','println(x % 4)','mod,kotlin')
;
