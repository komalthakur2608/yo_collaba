'use strict';

class _User {
  _id = '';
  name = '';
  email = '';
  role = '';
  $promise = undefined;
}

class _Org {
  _id = '';
  name = '';
  email = '';
  website = '';
  domainName = '';
  about = '';
  address = '';
  phone = '';
  members = [];
  teams = [];
  status = '';
  $promise = undefined;
}

export function AuthService($location, $http, $cookies, $q, appConfig, Util, User, Organisation) {
  'ngInject';

  var safeCb = Util.safeCb;
  var currentUser = new _User();
  var currentOrg = new _Org();
  var userRoles = appConfig.userRoles || [];
  /**
   * Check if userRole is >= role
   * @param {String} userRole - role of current user
   * @param {String} role - role to check against
   */
  var hasRole = function (userRole, role) {
    return userRoles.indexOf(userRole) >= userRoles.indexOf(role);
  };

  if ($cookies.get('token') && $location.path() !== '/logout') {
    currentUser = User.get();
  }

  var Auth = {
    /**
     * Authenticate user and save token
     *
     * @param  {Object}   user     - login info
     * @param  {Function} callback - function(error, user)
     * @return {Promise}
     */
    login({
      email,
      password
    }, callback) {
      return $http.post('/auth/local', {
          email,
          password
        })
        .then(res => {
          $cookies.put('token', res.data.token);
          currentUser = User.get();
          return currentUser.$promise;
        })
        .then(user => {
          safeCb(callback)(null, user);
          return user;
        })
        .catch(err => {
          Auth.logout();
          safeCb(callback)(err.data);
          return $q.reject(err.data);
        });
    },

    loginOrganisation({
      email,
      password
    }, callback) {
      return $http.post('/auth/local/organisation', {
          email,
          password
        })
        .then(res => {
          $cookies.put('token', res.data.token);
          return Organisation.get({id : res.data.org._id}).$promise.then(org =>{
            currentOrg = org;
            console.log(currentOrg);
            return currentOrg;
          });
          
        })
        .then(user => {
          console.log(currentOrg);
          console.log(user);
          safeCb(callback)(null, user);
          return user;
        })
        .catch(err => {
          console.log('err occured');
          console.log(err);
          Auth.logoutOrganisation();
          safeCb(callback)(err.data);
          return $q.reject(err.data);
        });
    },

    /**
     * Delete access token and user info
     */
    logout() {
      console.log("logout called");
      $cookies.remove('token');
      currentUser = new _User();
    },
    logoutOrganisation() {
      console.log("organisation logout called");
      $cookies.remove('token');
      currentOrg = new _Org();
    },

    /**
     * Create a new user
     *
     * @param  {Object}   user     - user info
     * @param  {Function} callback - function(error, user)
     * @return {Promise}
     */
    createUser(user, callback) {
      return User.save(user, function (data) {
          $cookies.put('token', data.token);
          currentUser = User.get();
          return safeCb(callback)(null, user);
        }, function (err) {
          Auth.logout();
          return safeCb(callback)(err);
        })
        .$promise;
    },

    /**
     * Create a new organisation
     *
     * @param  {Object}   user     - organisation info
     * @param  {Function} callback - function(error, organisation)
     * @return {Promise}
     */
    createOrganisation(organisation, callback) {
      return Organisation.save(organisation, function (data) {
          return 'saved';
        }, function (err) {
          return 'error';
        })
        .$promise;
    },

    /**
     * Change password
     *
     * @param  {String}   oldPassword
     * @param  {String}   newPassword
     * @param  {Function} callback    - function(error, user)
     * @return {Promise}
     */
    changePassword(oldPassword, newPassword, callback) {
      return User.changePassword({
          id: currentUser._id
        }, {
          oldPassword,
          newPassword
        }, function () {
          return safeCb(callback)(null);
        }, function (err) {
          return safeCb(callback)(err);
        })
        .$promise;
    },

    changePasswordOrg(oldPassword, newPassword, callback) {
      return Organisation.changePassword({
          id: currentOrg._id
        }, {
          oldPassword,
          newPassword
        }, function () {
          return safeCb(callback)(null);
        }, function (err) {
          return safeCb(callback)(err);
        })
        .$promise;
    },

    /**
     * Gets all available info on a user
     *
     * @param  {Function} [callback] - function(user)
     * @return {Promise}
     */
    getCurrentUser(callback) {
      var value = _.get(currentUser, '$promise') ? currentUser.$promise : currentUser;

      return $q.when(value)
        .then(user => {
          safeCb(callback)(user);
          return user;
        }, () => {
          safeCb(callback)({});
          return {};
        });
    },

    /**
     * Gets all available info on a user
     *
     * @return {Object}
     */
    getCurrentUserSync() {
      return currentUser;
    },

    getCurrentOrgSync() {
      return currentOrg;
    },

    /**
     * Check if a user is logged in
     *
     * @param  {Function} [callback] - function(is)
     * @return {Promise}
     */
    isLoggedIn(callback) {
      return Auth.getCurrentUser(undefined)
        .then(user => {
          let is = _.get(user, 'role');

          safeCb(callback)(is);
          return is;
        });
    },

    /**
     * Check if a user is logged in
     *
     * @return {Bool}
     */
    isLoggedInSync() {
      return !!_.get(currentUser, 'role');
    },

    isLoggedInOrgSync() {
      return !!_.get(currentOrg, 'name');
    },

    /**
     * Check if a user has a specified role or higher
     *
     * @param  {String}     role     - the role to check against
     * @param  {Function} [callback] - function(has)
     * @return {Promise}
     */
    hasRole(role, callback) {
      return Auth.getCurrentUser(undefined)
        .then(user => {
          let has = hasRole(_.get(user, 'role'), role);

          safeCb(callback)(has);
          return has;
        });
    },

    /**
     * Check if a user has a specified role or higher
     *
     * @param  {String} role - the role to check against
     * @return {Bool}
     */
    hasRoleSync(role) {
      return hasRole(_.get(currentUser, 'role'), role);
    },

    /**
     * Check if a user is an admin
     *   (synchronous|asynchronous)
     *
     * @param  {Function|*} callback - optional, function(is)
     * @return {Bool|Promise}
     */
    isAdmin() {
      return Auth.hasRole.apply(Auth, [].concat.apply(['admin'], arguments));
    },

    /**
     * Check if a user is an admin
     *
     * @return {Bool}
     */
    isAdminSync() {
      return Auth.hasRoleSync('admin');
    },

    /**
     * Get auth token
     *
     * @return {String} - a token string used for authenticating
     */
    getToken() {
      return $cookies.get('token');
    }
  };

  return Auth;
}
