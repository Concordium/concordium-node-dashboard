pipeline {
    agent any

    environment {
        ecr_repo_base = '192549843005.dkr.ecr.eu-west-1.amazonaws.com/concordium'
        image_repo = "${ecr_repo_base}/node-dashboard"
        image_name = "${image_repo}:${image_tag}"
    }

    stages {
        stage('ecr-login') {
            steps {
                sh '$(aws --region eu-west-1 ecr get-login | sed -e \'s/-e none//g\')'
            }
        }
        stage('build') {
            steps {
                sh '''
                    docker build -t "${image_name}" .
                    docker push "${image_name}"
                '''
            }
        }
    }
}