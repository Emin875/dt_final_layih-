import os
from flask import Flask, redirect, render_template, request, url_for, session, make_response
import psycopg2

app = Flask(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
  conn = psycopg2.connect(DATABASE_URL)
  return conn


@app.route("/", methods=["GET", "POST"])
def index():
  if request.method == "POST" and request.cookies.get("form_submitted") == "true":
    return "Siz artıq bu sorğunu cavablandırmısınız.", 403

  conn = get_db_connection()
  cur = conn.cursor()

  if request.method == "POST":
    age = int(request.form["age"])
    grade = int(request.form["grade"])
    free_day = request.form["free_day"]
    activity_id = int(request.form["activity_id"])
    companion_id = int(request.form["companion_id"])
    hours_per_day = float(request.form["hours_per_day"])
    satisfaction = int(request.form["satisfaction"])

    cur.execute(
        """
            INSERT INTO responses (age, grade, free_day, activity_id, companion_id, hours_per_day, satisfaction)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            age,
            grade,
            free_day,
            activity_id,
            companion_id,
            hours_per_day,
            satisfaction,
        ),
    )
    conn.commit()
    cur.close()
    conn.close()

    resp = make_response(redirect(url_for("index")))
    resp.set_cookie(
        "form_submitted",
        "true",
        max_age=60 * 60 * 24 * 365,
        samesite="Lax",
        secure=True,
    )
    return resp

  cur.execute("SELECT id, name FROM activities;")
  activities = cur.fetchall()

  cur.execute("SELECT id, name FROM companions;")
  companions = cur.fetchall()

  cur.close()
  conn.close()

  return render_template(
      "index.html", activities=activities, companions=companions
  )

if __name__ == "__main__":
  app.run(debug=True)
