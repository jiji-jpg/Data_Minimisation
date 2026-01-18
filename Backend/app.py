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
    return render_template('pages/page0.html')

@app.route('/backgroundcheck')
def backgroundcheck():
    return render_template('pages/backgroundcheck.html')

@app.route('/DA1')
def DA1():
    return render_template('pages/DataAsset1.html')

if __name__ == '__main__':
    app.run(debug=True, port=8000)