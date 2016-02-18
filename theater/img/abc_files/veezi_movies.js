function VeeziTheater() {
  var self = this;
  this.movies = [];
  this.showings = [];

  this.init = function(theater) {
    var promise = $.ajax({ url: '/veezi_movies?theater=' + theater });

    promise.done(function(response) {
      var data = JSON.parse(response.content);

      for(var i = 0; i < data.showtimes.length; i++) {
        var showing = new VeeziShowing(data.showtimes[i]);
        self.showings.push(showing);
      }

      for(var i = 0; i < data.movies.length; i++) {
        var movie = new VeeziMovie(data.movies[i], data.showtimes);
        self.movies.push(movie);
      }
    })

    return promise;
  }

  this.availableDates = function() {
    return _.uniq(_.map(this.showings, function(showing) { return moment(showing.FeatureStartTime).format('YYYY-MM-DD'); }));
  }

  this.filterMoviesByDate = function(date) {
    var movies = _.filter(this.movies, function(movie) { return _.contains(movie.showDates(), date) && movie.Status === 'Active' } );
    _.each(movies, function(movie) {
      movie.availableShowings = _.filter(movie.showings, function(showing) {
        return moment(showing.FeatureStartTime).format('YYYY-MM-DD') === date;
      });
    });

    return movies;
  }
}

function VeeziMovie(data, showings) {
  var self = this;
  this.showings = [];
  this.availableShowings = [];

  this.setShowings(data, showings, function() {
    for (var attribute in data) {
      self[attribute] = data[attribute];
    }
  });

  return this;
}

VeeziMovie.prototype.setShowings = function(data, showings, callback) {
  for(var i = 0; i < showings.length; i++) {
    if (showings[i].Title === data.Title) {
      this.showings.push(new VeeziShowing(showings[i]));
    }
  }
  callback();
}

VeeziMovie.prototype.showDates = function() {
  return _.uniq(_.map(this.showings, function(showing) { return moment(showing.FeatureStartTime).format('YYYY-MM-DD') } ));
}

function VeeziShowing(data) {
  var self = this;

  for (var attribute in data) {
    self[attribute] = data[attribute];
  }

  return this;
}

VeeziShowing.prototype.isSoldOut = function() {
  var seatsAvailable = parseInt(this.SeatsAvailable);
  return seatsAvailable <= 0 ? true : false;
}

function VeeziView(model) {
  var model = model;
  var templates = [
    {
      source: $('#movie-showtimes-template').html(),
      template: undefined
    },
    {
      source: $('#movie-date-template').html(),
      template: undefined
    }
  ]

  var $mainElement = $('div.showtimes.group');

  function addHelpers() {
    Handlebars.registerHelper('formattedDuration', function(minutes) {
      var hours = Math.floor(minutes / 60);
      var minutes = minutes % 60;
      if (minutes < 10) {
        minutes = '0' + minutes;
      }
      return hours + ':' + minutes;
    });

    Handlebars.registerHelper('formattedTime', function(time) {
      return moment(time).format('h:mm a')
    });

    Handlebars.registerHelper('formattedDate', function(date) {
      return moment(date).format('ddd MMM Do');
    });
  }

  function registerEventHandlers() {
    $(document).on('change', '#movie-date-select', function(event) {
      $this = $(this);
      renderMovieEntries($this.val());
    });
  }

  function compileTemplates() {
    for (var i = 0; i < templates.length; i++) {
      templates[i].template = Handlebars.compile(templates[i].source);
    }
  }

  function renderSelect() {
    var context = { dates: model.availableDates() };
    var html = templates[0].template(context);
    $mainElement.prepend(html);
  }

  function renderMovieEntries(date) {
    var context = { movies: model.filterMoviesByDate(date) };
    var alphaSortedMovies = _.sortBy(context.movies, function(movie) {
      return movie['Title'];
    });
    context.movies = alphaSortedMovies;
    var html = templates[1].template(context);
    $mainElement.find('div#movie-entries').html(html);
  }

  addHelpers();
  compileTemplates();
  renderSelect();
  renderMovieEntries(model.availableDates()[0]);
  registerEventHandlers();
}

jQuery(function($){
  theater = new VeeziTheater();
  var promise = theater.init(app.theater);
  promise.done(function() {
    new VeeziView(theater);
  })
});
