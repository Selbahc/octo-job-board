const request = require('request');
const config = require('../config/index');
const { flattenDeep } = require('lodash');

const OctopodClient = {

  getAccessToken() {
    return new Promise((resolve, reject) => {
      const options = {
        url: `${config.OCTOPOD_API_URL}/oauth/token`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        form: {
          grant_type: 'client_credentials',
          client_id: config.OCTOPOD_CLIENT_ID,
          client_secret: config.OCTOPOD_CLIENT_SECRET,
        },
      };

      request.post(options, (err, response) => {
        if (err) {
          reject(err);
        }
        const accessToken = JSON.parse(response.body).access_token;
        resolve(accessToken);
      });
    });
  },

  _filterByStatus(project) {
    return project.status === 'mission_signed'
      || project.status === 'mission_accepted'
      || project.status === 'proposal_sent';
  },

  _filterByKind(project) {
    return project.kind === 'cost_reimbursable' || project.kind === 'fixed_price';
  },

  fetchProjectsToBeStaffed(accessToken) {
    return new Promise((resolve, reject) => {
      const options = {
        url: `${config.OCTOPOD_API_URL}/v0/projects?staffing_needed=true&page=1&per_page=50`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      };

      request.get(options, (err, response) => {
        if (err) {
          reject(err);
        }
        const projects = JSON.parse(response.body);
        const filteredProject = projects
          .filter(this._filterByStatus)
          .filter(this._filterByKind);
        resolve(filteredProject);
      });
    });
  },

  _fetchActivityToBeStaffed(accessToken, project) {
    return new Promise((resolve, reject) => {
      const options = {
        url: `${config.OCTOPOD_API_URL}/v0/projects/${project.id}/activities`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      };
      request.get(options, (err, response) => {
        if (err) {
          reject(err);
        }
        const activities = JSON.parse(response.body);
        resolve(activities);
      });
    });
  },

  fetchActivitiesToBeStaffed(accessToken, projects) {
    const activitiesByProject = projects.map(project => this._fetchActivityToBeStaffed(accessToken, project));

    return Promise.all(activitiesByProject)
      .then((projectActivities) => {
        const concatenatedActivities = flattenDeep(projectActivities);
        return concatenatedActivities.filter(activity => !!activity.staffing_needed_from);
      });
  },

};

module.exports = OctopodClient;
