package com.oj.friend.controller.question;


import com.oj.common.controller.BaseController;
import com.oj.common.entity.TableDataInfo;
import com.oj.friend.entity.question.dto.QuestionQueryDto;
import com.oj.friend.service.question.IQuestionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "C端题目")
@RestController
@RequestMapping("/question")
public class QuestionController extends BaseController {


    @Autowired
    private IQuestionService questionService;


    @GetMapping("/semiLogin/list")
    public TableDataInfo list(QuestionQueryDto questionQueryDto) {
        return questionService.list(questionQueryDto);
    }

}
