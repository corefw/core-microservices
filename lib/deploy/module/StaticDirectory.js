/**
 * @file Defines the StaticDirectory class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @since 5.1.30
 * @license See LICENSE.md for details about licensing.
 * @copyright 2019 C2C Schools, LLC
 */

"use strict";

// Important Note
// --------------
// This module only loads a single dependency, directly, which is the
// parent class for the class defined within. This is intended to force
// dependency loading through the parent class, by way of the `$dep()`
// method, in order to centralize dependency definition and loading.

const ParentClass	= require( "./BaseMetaDeployModule" );

/**
 * This "Deployment Module" deploys an arbitrary local directory, recursively,
 * to the deployment target(s).
 *
 * @memberOf Deploy.Module
 * @extends Deploy.Module.BaseMetaDeployModule
 */
class StaticDirectory extends ParentClass {

	// <editor-fold desc="--- Config Properties ------------------------------">

	/**
	 * The local source directory, relative to the service root,
	 * that will be deployed (recursively).
	 *
	 * @access public
	 * @default ""
	 * @type {string}
	 */
	get sourcePathRel() {
		return this.getConfigValue( "sourcePathRel", "" );
	}

	set sourcePathRel( val ) {
		this.setConfigValue( "sourcePathRel", val );
	}

	/**
	 * The absolute path to the local source directory that will be deployed
	 * (recursively).
	 *
	 * @access public
	 * @type {string}
	 */
	get sourcePathAbs() {
		return this.resolveLocalAbs( this.sourcePathRel );
	}

	/**
	 * The destination directory, relative to the deployment root, to which the
	 * local directory will be deployed.
	 *
	 * @access public
	 * @default ""
	 * @type {string}
	 */
	get destPathRel() {
		return this.getConfigValue( "destPathRel", "" );
	}

	set destPathRel( val ) {
		this.setConfigValue( "destPathRel", val );
	}


	// </editor-fold>

	// <editor-fold desc="--- Main Deployment Logic --------------------------">

	/**
	 * This is the main entry point for this deployment module. This method will
	 * be called, automatically, for each configured "deployment target" by
	 * the MetaDeploymentManager class.
	 *
	 * @access public
	 * @async
	 * @param {Deploy.Target.BaseMetaDeployTarget} target The deployment target.
	 * @returns {Promise}
	 */
	async deployToTarget( target ) {

		// Locals
		let me = this;
		let filesFinal = [];

		// Dependencies
		const _ = me.$dep("lodash");
		const PATH = me.$dep("path");

		// Read file contents
		let files = this.getFilesRecursive( this.sourcePathAbs );

		// Iterate over each local file and resolve the local
		// and destination relative paths.
		_.each( files, function( file ) {

			// We need the local path to be relative to
			// the service root, WITHOUT considering the
			// deployment settings (sourcePathRel & destPathRel).
			let localRel = me.resolveServiceRel( file.path );

			// We need the remote path to be relative to the
			// deployment root, but we must factor for the
			// deployment settings (sourcePathRel & destPathRel).
			let remoteRel = me.resolveTargetRel( file.path );

			// Add to the collection
			filesFinal.push(
				{
					localRelPath: localRel,
					remoteRelPath: remoteRel
				}
			);

		});

		// Tell the target to deploy all files..
		return target.deployFiles( filesFinal );

	}



	// </editor-fold>

	// <editor-fold desc="--- Utility Methods --------------------------------">



	/**
	 * Resolves the remote path, relative to the deployment root, for a given
	 * absolute path. This method will, first, resolve the local file's path,
	 * relative to the SOURCE (this.sourcePathAbs) root and, then, will
	 * resolve the path to which that file should be deployed, relative to
	 * the DEPLOYMENT root, while factoring the configured DESTINATION root
	 * path (this.destPathRel).
	 *
	 * @access public
	 * @param {string} absLocalPath An absolute, local, path.
	 * @returns {string}
	 */
	resolveTargetRel( absLocalPath ) {

		// Locals
		let me = this;

		// Dependencies
		const PATH = me.$dep("path");

		// Resolve path relative to the deployment/source root (sourcePathRel)
		let sourcePathRel = absLocalPath.replace( me.sourcePathAbs, "" );

		// Resolve remote path relative to the deployment root..
		let destPathRel = PATH.join ("/", me.destPathRel, sourcePathRel );

		// All done...
		return destPathRel;

	}



	// </editor-fold>

}

module.exports = StaticDirectory;
