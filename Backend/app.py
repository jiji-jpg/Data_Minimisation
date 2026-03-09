from flask import Flask, render_template

app = Flask(__name__, 
            template_folder='../Frontend/templates',
            static_folder='../Frontend/static')

@app.route('/')
def landing():
    """Landing page"""
    return render_template('pages/landing.html')

@app.route('/privacy')
def privacy():
    """Terms & Conditions"""
    return render_template('pages/privacy.html')

@app.route('/backgroundcheck')
def backgroundcheck():
    return render_template('pages/backgroundcheck.html')

@app.route('/sub_landing')
def sub_landing():
    """Sublanding"""
    return render_template('pages/0_Sublanding.html')

@app.route('/DA1')
def DA1():
    """Personal Data Header"""
    return render_template('pages/1_PersonalAssetQ.html')

@app.route('/report')
def report():
    """Report"""
    return render_template('pages/report.html')

if __name__ == '__main__':
    app.run(debug=True, port=8000)