var fs = require( 'fs' );
var os = require( 'os' );
var path = require( 'path' );
var vm = require( 'vm' );
var requireConfig = require( 'module' ).createRequire( require.resolve( '../src/config.js' ) );

QUnit.test( "config.ripgrepPath expands tilde and preserves executable lookup", function( assert )
{
    var home = fs.mkdtempSync( path.join( os.tmpdir(), 'todo-tree home $-' ) );
    var homedir = os.homedir;
    var configuredPath = "~/.local/bin/rg";
    var rgPath = path.join( home, '.local/bin/rg' );
    var vscode = {
        env: { appRoot: home },
        workspace: {
            getConfiguration: function()
            {
                return { ripgrep: configuredPath };
            }
        }
    };
    var configModule = { exports: {} };
    vm.runInNewContext( fs.readFileSync( require.resolve( '../src/config.js' ), 'utf8' ), {
        module: configModule,
        process: process,
        require: function( name )
        {
            return name === 'vscode' ? vscode : requireConfig( name );
        }
    } );

    try
    {
        os.homedir = function() { return home; };
        fs.mkdirSync( path.dirname( rgPath ), { recursive: true } );
        fs.writeFileSync( rgPath, '' );
        assert.strictEqual( configModule.exports.ripgrepPath(), rgPath, "expands a home-relative executable path" );

        configuredPath = rgPath;
        assert.strictEqual( configModule.exports.ripgrepPath(), rgPath, "preserves an absolute executable path" );
        configuredPath = path.relative( process.cwd(), rgPath );
        assert.strictEqual( configModule.exports.ripgrepPath(), configuredPath, "preserves a relative executable path" );
        configuredPath = "~/missing-rg";
        assert.strictEqual( configModule.exports.ripgrepPath(), undefined, "rejects a missing home-relative executable" );

        var bundledPath = path.join( home, 'node_modules/vscode-ripgrep/bin', process.platform === 'win32' ? 'rg.exe' : 'rg' );
        fs.mkdirSync( path.dirname( bundledPath ), { recursive: true } );
        fs.writeFileSync( bundledPath, '' );
        assert.strictEqual( configModule.exports.ripgrepPath(), bundledPath, "falls back when the configured executable is missing" );
        configuredPath = "";
        assert.strictEqual( configModule.exports.ripgrepPath(), bundledPath, "falls back when the setting is empty" );
        configuredPath = undefined;
        assert.strictEqual( configModule.exports.ripgrepPath(), bundledPath, "falls back when the setting is unset" );
        configuredPath = "~/.local/bin/rg";
        assert.strictEqual( configModule.exports.ripgrepPath(), rgPath, "prefers the configured executable over bundled ripgrep" );
    }
    finally
    {
        os.homedir = homedir;
        fs.rmSync( home, { recursive: true, force: true } );
    }
} );
