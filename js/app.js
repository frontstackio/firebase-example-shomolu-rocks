// Set up Vue Components for the different pages - Login, and Home
// Authentication simply uses localStorage

var Login = {
    template: '#Login',
    beforeRouteEnter: function(to, from, next) {
        if (localStorage.getItem('logged-in-user')) {
            next({ name: "home" });
        } else {
            next();
        }
    },
    data: function() {
        return {
            name: null
        }
    },
    created: function() {
        setTimeout(this.showInput, 2000);
    },
    methods: {
        saveUser: function(name) {
            if (!name) return;
            localStorage.setItem('logged-in-user', name);
            router.push('home');
        },
        showInput: function() {
            $('.login-text').removeClass('fadeIn').addClass('fadeOutLeft');
            $('.mid-section-comma').animate({ left: '-30px' });

            setTimeout(function() {
                $('.login-text').hide();
                $('.login-form, .login-button').show();
                $('.login-input').focus();
            }, 600);
        }
    }
};

var Home = {
    template: '#Home',
    beforeRouteEnter: function(to, from, next) {
        // If user is present, fetch all artworks before entering home page
        // Otherwise redirect to login

        if (localStorage.getItem('logged-in-user')) {
            firebase.database().ref('works').once('value').then(function(snapshot) {
                next(function(self) {
                    self.artwork = snapshot.val();
                });
            });
        } else {
            next({ name: "login" });
        }
    },
    data: function() {
        return {
            name: localStorage.getItem('logged-in-user'),
            artwork: null,
            id: null,
            viewArtModal: false,
            aboutModal: false,
            error: null
        }
    },
    methods: {
        openModal: function(variable) {
            _openModal(this, variable);
        },
        closeModal: function(variable) {
            _closeModal(this, variable);
        },
        check: function(id) {
            if (id === null) return;
            var self = this;

            if (!this.artwork[id]) {
                this.error = "No such id. Please try another";
                setTimeout(function() { self.error = null }, 2000);
                return;
            }

            this.closeModal('viewArtModal');
            setTimeout(function() {
                self.$router.push({ name: 'artwork', params: { id: id } })
            }, 500);
        }
    }
};

var Artwork = {
    template: '#Artwork',
    beforeRouteEnter: function(to, from, next) {
        if (localStorage.getItem('logged-in-user')) {
            next();
        } else {
            next({ name: "login" });
        }
    },
    data: function() {
        return {
            artwork: null,
            loaded: false,
            info: null,
            commentsRef: null,
            comments: [],
            hasCommented: false,
            phone: null,
            addCommentModal: false,
            buyArtModal: false,
            newComment: null
        }
    },
    watch: {
        '$route': 'fetchData'
    },
    created: function() {
        this.fetchData();
    },
    methods: {
        // Use the parameters from the route to fetch data for a specific artwork
        fetchData: function() {
            var self = this;
            var id = this.$route.params.id;
            var user = localStorage.getItem('logged-in-user');

            // This is how you fetch data in Firebase
            this.artwork = firebase.database().ref('works/' + id);
            this.commentsRef = firebase.database().ref('works/' + id + '/comments');

            this.artwork.on('value', function(snapshot) {
                self.info = snapshot.val();
                self.phone = localStorage.getItem('logged-in-phone');
                self.loaded = true;
            });

            this.listenForUpdates();
        },
        listenForUpdates: function() {
            var self = this;
            var id = this.$route.params.id;

            this.commentsRef.on('child_added', function(comment) {
                self.hasCommented = comment.val().name === localStorage.getItem('logged-in-user');
                self.comments.push(comment.val());
            })

            this.commentsRef.on('child_removed', function(comment) {
                self.comments.splice(comment.key, 1);
            })
        },
        openModal: function(variable) {
            _openModal(this, variable);
        },
        closeModal: function(variable) {
            _closeModal(this, variable);
        },
        post: function(message) {
            var payload = {
                body: message,
                name: localStorage.getItem('logged-in-user')
            }
            var self = this;
            var id = this.comments.length;

            // This is how you save data in Firebase
            var newMessage = this.commentsRef.push();
            newMessage.set(payload, function() {
                self.hasCommented = true;
                _closeModal(self, 'addCommentModal');
                _scrollToBottom();
            });
        },
        purchase: function(phone) {
            if (!phone || phone.length < 11) return;

            localStorage.setItem('logged-in-phone', phone);
            var payload = {
                buyerName: localStorage.getItem('logged-in-user'),
                buyerNumber: phone,
                purchased: "true"
            }
            var self = this;
            this.artwork.update(payload, function() {
                _closeModal(self, 'buyArtModal');
                _scrollToBottom();
            });
        }
    }
};

function _openModal(self, variable) {
    self[variable] = true;
    setTimeout(function() {
        $('#' + variable).find('.modal-form-input').focus();
    }, 500);
}

function _closeModal(self, variable) {
    var el = $('#' + variable);
    el.find('.modal-content').addClass('animated fadeOut');
    el.find('.modal-overlay').addClass('fadeOut');
    setTimeout(function() {
        el.find('.modal-content').remove('animated fadeOut');
        el.find('.modal-overlay').remove('fadeOut');
        self[variable] = false;
    }, 1000);
}

function _scrollToBottom() {
    $('.art-body').scrollTop($('.art-body')[0].scrollHeight);
}

// Use Vue Router to setup routing
var router = new VueRouter({
    routes: [
        { name: 'artwork', path: '/art/:id', component: Artwork },
        { name: 'home', path: '/', component: Home },
        { name: 'login', path: '/start', component: Login },
        { path: '*', redirect: '/' }
    ]
});

// Initialize Vue
var app;
window.onload = function() {
    $('body').show();
    app = new Vue({ router: router }).$mount('#app');
}

// Initialize firebase

var config = {}; // Enter your firebase config here
firebase.initializeApp(config);
