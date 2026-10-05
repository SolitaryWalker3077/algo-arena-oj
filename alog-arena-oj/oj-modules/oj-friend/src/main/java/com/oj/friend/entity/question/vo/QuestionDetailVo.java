package com.oj.friend.entity.question.vo;

import lombok.Data;

@Data
public class QuestionDetailVo extends QuestionVo{

    private Long timeLimit;

    private Long spaceLimit;

    private String content;

    private String defaultCode;

}
